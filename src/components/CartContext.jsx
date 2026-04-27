/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ProductsContext } from './ProductsContext'
import { AuthContext } from './AuthContext'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const CartCtx = createContext(null)

// ── Rate limiting (localStorage-based) ──────────────────────────────────────
function checkRateLimit(key, maxAttempts = 5, windowMs = 60_000) {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{"attempts":[],"blockedUntil":0}');
    if (stored.blockedUntil > now) {
      const remainingSecs = Math.ceil((stored.blockedUntil - now) / 1000);
      return { allowed: false, remainingSecs };
    }
    const recent = (stored.attempts || []).filter(t => t > now - windowMs);
    if (recent.length >= maxAttempts) {
      const blockedUntil = now + windowMs;
      localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil }));
      return { allowed: false, remainingSecs: Math.ceil(windowMs / 1000) };
    }
    recent.push(now);
    localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil: 0 }));
    return { allowed: true, remainingSecs: 0 };
  } catch {
    return { allowed: true, remainingSecs: 0 }; // fail open
  }
}

function resetRateLimit(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

const getEffectivePrice = (product) => {
  if (product?.descuento?.porcentaje && product?.descuento?.hasta) {
    const until = new Date(product.descuento.hasta)
    if (until > new Date()) {
      return product.price * (1 - product.descuento.porcentaje / 100)
    }
  }
  return product?.price ?? 0
}

const isValidItem = (item) =>
  item &&
  typeof item.id !== "undefined" &&
  typeof item.name === "string" &&
  typeof item.price === "number" &&
  typeof item.quantity === "number"

const loadCart = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidItem) : []
  } catch { return [] }
}

export const CartProvider = ({ children }) => {
  const { products } = useContext(ProductsContext)
  const { currentUser } = useContext(AuthContext)

  // Clave única por usuario — invitado tiene su propio espacio
  const cartKey = currentUser?.id
    ? `rixx_cart_${currentUser.id}`
    : 'rixx_cart_guest'

  const cartKeyRef = useRef(cartKey)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const openCart  = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  // Inicializa con el carrito del usuario actual
  const [items, setItems] = useState(() => loadCart(cartKey))

  // Ref para guardar el carrito del usuario anterior antes de cambiar
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  // Cuando cambia de usuario: guarda el carrito del anterior y carga el del nuevo
  useEffect(() => {
    const oldKey = cartKeyRef.current
    if (oldKey === cartKey) return

    // Persiste el carrito del usuario anterior
    localStorage.setItem(oldKey, JSON.stringify(itemsRef.current))

    // Carga el carrito del usuario nuevo
    setItems(loadCart(cartKey))
    cartKeyRef.current = cartKey
  }, [cartKey])

  // Persiste en cada cambio de items
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(items))
  }, [items, cartKey])

  const currentStock = (id) => {
    const p = products?.find(p => String(p.id) === String(id))
    return p?.stock ?? Infinity
  }

  const add = (product, qty = 1) => {
    if (!product?.id) return
    setItems(prev => {
      const maxStock = currentStock(product.id)
      const i = prev.findIndex(p => String(p.id) === String(product.id))
      if (i > -1) {
        const copy = [...prev]
        const newQty = Math.min((copy[i].quantity || 1) + qty, maxStock)
        copy[i] = { ...copy[i], quantity: newQty }
        return copy
      }
      const clampedQty = Math.min(Math.max(1, qty), maxStock)
      if (clampedQty === 0) return prev
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: clampedQty,
      }]
    })
  }

  const inc = (id) => setItems(prev => prev.map(i => {
    if (i.id !== id) return i
    const max = currentStock(id)
    return { ...i, quantity: Math.min(i.quantity + 1, max) }
  }))

  const dec = (id) => setItems(prev => prev.map(i =>
    i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
  ))
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const clear = () => setItems([])

  // ── Cupón ────────────────────────────────────────────────────
  const [couponCode,    setCouponCode]    = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, type, value }
  const [couponError,   setCouponError]   = useState("")
  const [couponLoading, setCouponLoading] = useState(false)

  // Helpers para rastrear cupones usados por usuario (localStorage)
  const getUsedCouponsKey = (userId) => `rixx_used_coupons_${userId}`
  const hasUsedCoupon = (userId, code) => {
    if (!userId) return false
    try {
      const used = JSON.parse(localStorage.getItem(getUsedCouponsKey(userId)) || "[]")
      return Array.isArray(used) && used.includes(code.toUpperCase())
    } catch { return false }
  }
  const markCouponUsed = (userId, code) => {
    if (!userId) return
    try {
      const key  = getUsedCouponsKey(userId)
      const used = JSON.parse(localStorage.getItem(key) || "[]")
      if (!used.includes(code.toUpperCase())) {
        localStorage.setItem(key, JSON.stringify([...used, code.toUpperCase()]))
      }
    } catch { /* ignorar */ }
  }

  const markAppliedCouponUsed = useCallback(() => {
    if (!appliedCoupon || !currentUser?.id) return
    markCouponUsed(currentUser.id, appliedCoupon.code)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCoupon, currentUser])

  const applyCoupon = useCallback(async (subtotal, overrideCode) => {
    const code = (overrideCode ?? couponCode).trim().toUpperCase()
    if (!code) { setCouponError("Ingresá un código de cupón"); return }

    // Rate limiting — máx 5 intentos por minuto por usuario/invitado
    const rlKey = `rixx_rl_coupon_${currentUser?.id || 'guest'}`;
    const rl = checkRateLimit(rlKey, 5, 60_000);
    if (!rl.allowed) {
      setCouponError(`Demasiados intentos. Esperá ${rl.remainingSecs} segundos.`);
      return;
    }

    // Verificar uso previo antes de consultar Supabase
    if (currentUser?.id && hasUsedCoupon(currentUser.id, code)) {
      setCouponError("El cupón ya fue utilizado en tu cuenta"); return
    }

    setCouponLoading(true)
    setCouponError("")
    let networkFailed = false
    try {
      if (!isSupabaseEnabled) { setCouponError("Cupones no disponibles en modo offline"); return }
      let result
      try {
        result = await Promise.race([
          supabase.from("coupons").select("*").eq("code", code).eq("active", true).single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ])
      } catch (e) {
        if (e.message === "timeout") { networkFailed = true }
        else throw e
      }

      if (networkFailed) {
        // Fallback hardcodeado — solo BIENVENIDA, solo para usuarios logueados, solo si no fue usado
        if (code !== "RIXX001") { setCouponError("No se pudo validar el cupón, intentá de nuevo"); return }
        if (!currentUser?.id) { setCouponError("Iniciá sesión para usar este cupón"); return }
        if (hasUsedCoupon(currentUser.id, code)) { setCouponError("El cupón RIXX001 ya fue utilizado en tu cuenta"); return }
        setAppliedCoupon({ code: "RIXX001", type: "percentage", value: 10 })
        setCouponError("")
        resetRateLimit(rlKey)
        return
      }

      const { data, error } = result
      if (error || !data) { setCouponError("Cupón inválido o no encontrado"); return }
      if (data.valid_until && new Date(data.valid_until) < new Date()) { setCouponError("Este cupón ha expirado"); return }
      if (data.min_purchase && subtotal < data.min_purchase) {
        setCouponError(`Compra mínima de $${data.min_purchase} para usar este cupón`); return
      }
      if (data.max_uses != null && data.used_count >= data.max_uses) { setCouponError("Este cupón ya alcanzó el límite de usos"); return }
      setAppliedCoupon({ code: data.code, type: data.type, value: data.value })
      setCouponError("")
    } catch { setCouponError("Error al validar el cupón, intentá de nuevo") }
    finally { setCouponLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, currentUser])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
  }, [])

  const count = useMemo(() => items.reduce((a, i) => a + (i.quantity || 1), 0), [items])

  const total = useMemo(() => items.reduce((acc, item) => {
    const liveProduct = products?.find(p => String(p.id) === String(item.id))
    const price = liveProduct ? getEffectivePrice(liveProduct) : item.price
    return acc + price * (item.quantity || 1)
  }, 0), [items, products])

  const shippingCost = useMemo(() => (count === 0 ? 0 : total >= 3000 ? 0 : 290), [count, total])

  const syncedItems = useMemo(() => items.map(item => {
    const liveProduct = products?.find(p => String(p.id) === String(item.id))
    return {
      ...item,
      currentPrice: liveProduct ? getEffectivePrice(liveProduct) : item.price,
      maxStock: liveProduct?.stock ?? Infinity,
    }
  }), [items, products])

  const appliedDiscount = useMemo(() => {
    if (!appliedCoupon) return 0
    return appliedCoupon.type === "percentage"
      ? total * (appliedCoupon.value / 100)
      : appliedCoupon.value
  }, [appliedCoupon, total])

  const value = useMemo(() => ({
    items,
    syncedItems,
    add,
    inc,
    dec,
    remove,
    clear,
    count,
    total,
    shippingCost,
    isCartOpen,
    openCart,
    closeCart,
    couponCode,
    setCouponCode,
    appliedCoupon,
    appliedDiscount,
    couponError,
    couponLoading,
    applyCoupon,
    removeCoupon,
    markAppliedCouponUsed,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, syncedItems, count, total, shippingCost, isCartOpen, couponCode, appliedCoupon, appliedDiscount, couponError, couponLoading, applyCoupon, removeCoupon, markAppliedCouponUsed])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)
