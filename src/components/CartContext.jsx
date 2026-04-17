import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ProductsContext } from './ProductsContext'
import { AuthContext } from './AuthContext'

const CartCtx = createContext(null)

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
  }), [items, syncedItems, count, total, shippingCost, isCartOpen])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)
