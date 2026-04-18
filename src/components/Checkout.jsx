import { useState, useEffect, useContext } from "react";
import { useCart } from "./CartContext.jsx";
import { useOrders } from "./OrdersContext.jsx";
import { AuthContext } from "./AuthContext.jsx";
import { ProductsContext } from "./ProductsContext.jsx";
import { supabase, isSupabaseEnabled } from "../lib/supabase.js";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Checkout.scss";

// Formatea número uruguayo para wa.me (agrega 598, quita el 0 inicial)
function toWaNumber(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.startsWith("598") ? d : `598${d.replace(/^0/, "")}`;
}
const SHIPPING_FREE_THRESHOLD = 3000;  // UYU — envío gratis sobre este monto
const SHIPPING_COST = 290;             // UYU — costo fijo de envío

const DEPARTAMENTOS = [
  "Montevideo", "Canelones", "Florida",
  "Maldonado", "Paysandú", "Salto",
  "Rivera", "Tacuarembó", "Otro",
];

const EMPTY_FORM = {
  nombre: "", email: "", telefono: "",
  departamento: "Montevideo", direccion: "", notas: "",
  phone: "", marketingOptIn: false,
};

const EMPTY_ERRORS = {
  nombre: "", email: "", telefono: "", direccion: "",
};

const EMPTY_CARD = {
  cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "",
};

const EMPTY_CARD_ERRORS = {
  cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "",
};

const SESSION_KEY   = "rixx_checkout_form";
const PERSIST_KEY   = "rixx_checkout_contact"; // nombre, email, telefono → persiste entre sesiones

// ── Helpers ───────────────────────────────────────────────────

function sanitize(str) {
  return String(str ?? "")
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, 500);
}

function formatPrice(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency", currency: "UYU", maximumFractionDigits: 0,
  }).format(n);
}

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePhone(v) {
  return /^09[0-9]\s?[0-9]{3}\s?[0-9]{3}$/.test(v.trim());
}

function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

// Detecta la red de la tarjeta por prefijo
function detectCardBrand(number) {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n))            return "visa";
  if (/^5[1-5]/.test(n))      return "mastercard";
  if (/^3[47]/.test(n))       return "amex";
  return null;
}

function calcShipping(subtotal) {
  return subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_COST;
}

function buildWhatsAppMessage(form, items, subtotal, shipping, discount = 0, total) {
  const finalTotal = total ?? (subtotal + shipping - discount);
  const orderId = Math.random().toString(36).slice(2, 10).toUpperCase();
  const lines = [];

  lines.push(`Hola! 👋 Quiero confirmar mi pedido *#${orderId}*.`);
  lines.push(``);
  lines.push(`🛍️ *Productos:*`);
  items.forEach((item) => {
    const price = item.currentPrice ?? item.price;
    const sub = formatPrice(price * (item.quantity || 1));
    lines.push(`• ${item.name} x${item.quantity || 1} → ${sub}`);
  });
  lines.push(`📦 *Envío:* ${shipping === 0 ? "Gratis ✅" : formatPrice(shipping)}`);
  if (discount > 0) lines.push(`🎟️ *Descuento:* -${formatPrice(discount)}`);
  lines.push(`💰 *Total: ${formatPrice(finalTotal)}*`);
  lines.push(``);
  lines.push(`👤 ${form.nombre} | 📱 ${form.telefono} | 📍 ${form.departamento}`);
  if (form.notas.trim()) lines.push(`📝 ${form.notas}`);
  lines.push(``);
  lines.push(`─────────────────────────`);
  lines.push(`Para confirmar el pedido realizá el pago *antes de las 24hs*:`);
  lines.push(``);
  lines.push(`💳 *Transferencia bancaria (BROU)*`);
  lines.push(`• Titular: RIXX Lentes`);
  lines.push(`• Cuenta corriente: 001-234567/8`);
  lines.push(`• RUT: 21.234.567-0`);
  lines.push(``);
  lines.push(`🏦 *RedPagos / Abitab*`);
  lines.push(`• Código: 7821-4563`);
  lines.push(``);
  lines.push(`📱 *Mercado Pago*`);
  lines.push(`• Alias: rixx.lentes`);
  lines.push(``);
  lines.push(`Una vez realizado el pago, envianos el *comprobante por este chat* y tu paquete pasa directo a preparación para envío. 📦`);
  lines.push(``);
  lines.push(`¡Gracias por tu compra! 🙌`);
  lines.push(`*RIXX Lentes*`);

  return lines.join("\n");
}

// ── Componente ────────────────────────────────────────────────

export default function Checkout() {
  const { syncedItems: items, total: subtotal, clear } = useCart();
  const { createOrder } = useOrders();
  const { isLoggedIn, register } = useContext(AuthContext);
  const { products, updateProduct } = useContext(ProductsContext);
  const navigate = useNavigate();

  // ── Post-purchase account creation modal ─────────────────────
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [modalPassword, setModalPassword]       = useState("");
  const [modalError, setModalError]             = useState("");
  const [modalLoading, setModalLoading]         = useState(false);
  const [lastOrder, setLastOrder]               = useState(null);

  // ── Coupon state ──────────────────────────────────────────────
  const [couponCode, setCouponCode]       = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);  // { type, value, code }
  const [couponError, setCouponError]     = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const appliedDiscount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? subtotal * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;

  const shipping  = calcShipping(subtotal);
  const grandTotal = subtotal + shipping - appliedDiscount;

  // Cargar form: sessionStorage (pasos actuales) + localStorage (contacto persistente)
  const savedForm = (() => {
    try {
      const session  = JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
      const contact  = JSON.parse(localStorage.getItem(PERSIST_KEY))  || {};
      return { ...EMPTY_FORM, ...contact, ...session };
    } catch { return EMPTY_FORM; }
  })();

  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState(savedForm);
  const [errors, setErrors]         = useState(EMPTY_ERRORS);
  const [paymentMethod, setPaymentMethod] = useState("whatsapp");
  const [card, setCard]             = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState(EMPTY_CARD_ERRORS);
  const [sent, setSent]             = useState(false);
  const [processing, setProcessing] = useState(false);

  // Persistir form completo en sessionStorage (pasos actuales)
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(form));
  }, [form]);

  // Persistir contacto en localStorage (sobrevive al cierre del navegador)
  useEffect(() => {
    const { nombre, email, telefono } = form;
    if (nombre || email || telefono) {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ nombre, email, telefono }));
    }
  }, [form.nombre, form.email, form.telefono]);

  if (items.length === 0 && !sent) {
    return (
      <div className="checkout checkout--empty">
        <div className="checkout__empty-box">
          <p className="checkout__empty-icon">◆</p>
          <h2>Tu carrito está vacío</h2>
          <p>Agregá productos antes de hacer un pedido.</p>
          <Link to="/productos" className="checkout__btn checkout__btn--primary">
            Ver productos
          </Link>
        </div>
      </div>
    );
  }

  // ── Coupon handler ────────────────────────────────────────
  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError("Ingresá un código de cupón"); return; }
    setCouponLoading(true);
    setCouponError("");

    try {
      if (!isSupabaseEnabled) {
        setCouponError("Cupones no disponibles en modo offline");
        return;
      }

      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        setCouponError("Cupón inválido o no encontrado");
        return;
      }

      // Validar expiración
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setCouponError("Este cupón ha expirado");
        return;
      }

      // Validar compra mínima
      if (data.min_purchase && subtotal < data.min_purchase) {
        setCouponError(
          `Este cupón requiere una compra mínima de ${formatPrice(data.min_purchase)}`
        );
        return;
      }

      // Validar usos máximos
      if (data.max_uses != null && data.used_count >= data.max_uses) {
        setCouponError("Este cupón ya alcanzó el límite de usos");
        return;
      }

      setAppliedCoupon({ type: data.type, value: data.value, code: data.code });
      setCouponError("");
    } catch (err) {
      console.error("[Checkout] applyCoupon error:", err);
      setCouponError("Error al validar el cupón, intentá de nuevo");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // ── Handlers ──────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: "" }));
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === "cardNumber") formatted = formatCardNumber(value);
    if (name === "cardExpiry") formatted = formatExpiry(value);
    if (name === "cardCvv")    formatted = value.replace(/\D/g, "").slice(0, 4);
    setCard((c) => ({ ...c, [name]: formatted }));
    if (cardErrors[name]) setCardErrors((err) => ({ ...err, [name]: "" }));
  };

  const validateStep1 = () => {
    const newErrors = { ...EMPTY_ERRORS };
    let valid = true;
    if (!form.nombre.trim())    { newErrors.nombre = "El nombre es obligatorio"; valid = false; }
    if (!form.email.trim())     { newErrors.email = "El email es obligatorio"; valid = false; }
    else if (!validateEmail(form.email)) { newErrors.email = "Formato de email inválido"; valid = false; }
    if (!form.telefono.trim())  { newErrors.telefono = "El teléfono es obligatorio"; valid = false; }
    else if (!validatePhone(form.telefono)) { newErrors.telefono = "Ingresá un número uruguayo válido (09X XXX XXX)"; valid = false; }
    if (!form.direccion.trim()) { newErrors.direccion = "La dirección es obligatoria"; valid = false; }
    setErrors(newErrors);
    return valid;
  };

  const validateCard = () => {
    const newErrors = { ...EMPTY_CARD_ERRORS };
    let valid = true;
    const digits = card.cardNumber.replace(/\s/g, "");
    if (digits.length < 16)                        { newErrors.cardNumber = "Número de tarjeta inválido"; valid = false; }
    if (!card.cardName.trim())                     { newErrors.cardName = "El nombre es obligatorio"; valid = false; }
    if (!/^\d{2}\/\d{2}$/.test(card.cardExpiry)) { newErrors.cardExpiry = "Formato MM/AA"; valid = false; }
    if (card.cardCvv.length < 3)                  { newErrors.cardCvv = "CVV inválido"; valid = false; }
    setCardErrors(newErrors);
    return valid;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const buildOrderPayload = (method) => ({
    user_email: sanitize(form.email),
    user_name: sanitize(form.nombre),
    user_phone: sanitize(form.telefono),
    shipping_address: {
      direccion: sanitize(form.direccion),
      departamento: sanitize(form.departamento),
    },
    items: items.map((i) => ({
      product_id: String(i.id),
      name: i.name,
      qty: i.quantity || 1,
      price: i.currentPrice ?? i.price,
      image: i.image ?? null,
    })),
    subtotal,
    shipping,
    free_shipping: shipping === 0,
    discount: appliedDiscount,
    total: grandTotal,
    coupon_code: appliedCoupon?.code ?? null,
    status: "confirmado",
    payment_method: method,
    notes: sanitize(form.notas),
    marketing_opt_in: form.marketingOptIn,
  });

  const decrementStock = (orderItems) => {
    (orderItems || []).forEach((item) => {
      const product = products.find((p) => String(p.id) === String(item.product_id || item.id));
      if (!product) return;
      const qty = item.qty || item.quantity || 1;
      const newStock = Math.max(0, (product.stock ?? 0) - qty);
      updateProduct({ ...product, stock: newStock });
    });
  };

  const afterOrderCreated = (order) => {
    decrementStock(order.items);
    sessionStorage.removeItem(SESSION_KEY);
    clear();
    setSent(true);
    setStep(3);
    setLastOrder(order);
    // Show account-creation modal only if user isn't logged in
    if (!isLoggedIn) {
      setTimeout(() => setShowAccountModal(true), 800);
    }
    // Fire email confirmation to backend (best-effort)
    fetch("http://localhost:4000/api/email/order-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(() => {/* backend may not be running — silent fail */});
  };

  const handleConfirmWhatsApp = async () => {
    // Guardar el pedido PRIMERO antes de abrir WhatsApp
    // (el navegador puede suspender la página al salir, interrumpiendo createOrder)
    let order = buildOrderPayload("whatsapp");
    try { order = await createOrder(order) ?? order; } catch (e) { console.error(e); }

    // Recién después abrir WhatsApp
    const msg = buildWhatsAppMessage(form, items, subtotal, shipping, appliedDiscount, grandTotal);
    const url = `https://wa.me/${toWaNumber(form.telefono)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    afterOrderCreated(order);
  };

  const handleConfirmCard = () => {
    if (!validateCard()) return;
    setProcessing(true);
    setTimeout(async () => {
      let order = buildOrderPayload("tarjeta");
      try { order = await createOrder(order) ?? order; } catch (e) { console.error(e); }
      setProcessing(false);
      afterOrderCreated(order);
    }, 1800);
  };

  const handleCreateAccount = async () => {
    if (!modalPassword || modalPassword.length < 6) {
      setModalError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setModalLoading(true);
    setModalError("");
    const ok = await register(form.nombre, form.email, modalPassword);
    setModalLoading(false);
    if (ok) {
      setShowAccountModal(false);
    } else {
      setModalError("No se pudo crear la cuenta. El email puede ya estar registrado.");
    }
  };

  const handleConfirm = () => {
    if (paymentMethod === "whatsapp") handleConfirmWhatsApp();
    else handleConfirmCard();
  };

  // ── Derivados de tarjeta ───────────────────────────────────
  const cardBrand = detectCardBrand(card.cardNumber);

  const STEPS = ["Datos", "Pago", "Confirmación"];

  return (
    <div className="checkout">
      <div className="checkout__inner">

        {/* ── Step Indicator ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done    = step > n;
            const current = step === n;

            const circleStyle = {
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: current ? 700 : 400,
              flexShrink: 0,
              border: done
                ? "2px solid #D4AF37"
                : current
                  ? "2px solid #D4AF37"
                  : "2px solid #353534",
              background: done
                ? "rgba(212,175,55,0.15)"
                : current
                  ? "#D4AF37"
                  : "transparent",
              color: done
                ? "#D4AF37"
                : current
                  ? "#0a0a0a"
                  : "#99907c",
            };

            const labelColor = done
              ? "#D4AF37"
              : current
                ? "#D4AF37"
                : "#99907c";

            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={circleStyle}>{done ? "✓" : n}</div>
                  <span style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: labelColor,
                    whiteSpace: "nowrap",
                  }}>{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: "#353534",
                    maxWidth: 48,
                    minWidth: 24,
                    marginBottom: 17,
                    alignSelf: "flex-start",
                    marginTop: 14,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ════ PASO 1 — Datos del cliente ════ */}
        {step === 1 && (
          <div className="checkout__section fade-enter">
            <h2 className="checkout__heading">Datos de entrega</h2>

            <div className="checkout__grid">
              <div className="checkout__field">
                <label className="checkout__label">Nombre completo *</label>
                <input
                  className={`checkout__input${errors.nombre ? " checkout__input--error" : ""}`}
                  name="nombre" value={form.nombre} onChange={handleChange}
                  placeholder="Ej: Juan Pérez" autoComplete="name"
                />
                {errors.nombre && <p className="field-error">{errors.nombre}</p>}
              </div>

              <div className="checkout__field">
                <label className="checkout__label">Email *</label>
                <input
                  className={`checkout__input${errors.email ? " checkout__input--error" : ""}`}
                  name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="tu@email.com" autoComplete="email"
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="checkout__field">
                <label className="checkout__label">Teléfono (Uruguay) *</label>
                <input
                  className={`checkout__input${errors.telefono ? " checkout__input--error" : ""}`}
                  name="telefono" value={form.telefono} onChange={handleChange}
                  placeholder="099 123 456" autoComplete="tel" maxLength={12}
                />
                {errors.telefono && <p className="field-error">{errors.telefono}</p>}
              </div>

              <div className="checkout__field">
                <label className="checkout__label">Departamento *</label>
                <select
                  className="checkout__input checkout__input--select"
                  name="departamento" value={form.departamento} onChange={handleChange}
                >
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="checkout__field checkout__field--full">
              <label className="checkout__label">Dirección de entrega *</label>
              <textarea
                className={`checkout__input checkout__input--textarea${errors.direccion ? " checkout__input--error" : ""}`}
                name="direccion" value={form.direccion} onChange={handleChange}
                placeholder="Calle, número, apartamento, esquina..." rows={3}
              />
              {errors.direccion && <p className="field-error">{errors.direccion}</p>}
            </div>

            <div className="checkout__field">
              <label className="checkout__label">
                Celular <span className="checkout__optional">(opcional)</span>
              </label>
              <input
                className="checkout__input"
                name="phone" value={form.phone} onChange={handleChange}
                placeholder="099 123 456" autoComplete="tel" maxLength={12}
              />
            </div>

            <div className="checkout__field checkout__field--full">
              <label className="checkout__label">
                Notas adicionales <span className="checkout__optional">(opcional)</span>
              </label>
              <textarea
                className="checkout__input checkout__input--textarea"
                name="notas" value={form.notas} onChange={handleChange}
                placeholder="Horario preferido, instrucciones especiales..." rows={2}
              />
            </div>

            {/* Marketing opt-in */}
            <label className="checkout__optin">
              <input
                type="checkbox"
                className="checkout__optin-check"
                checked={form.marketingOptIn}
                onChange={e => setForm(f => ({ ...f, marketingOptIn: e.target.checked }))}
              />
              <span className="checkout__optin-text">
                Quiero recibir novedades, drops y promociones exclusivas por WhatsApp y email
              </span>
            </label>

            {/* Banner envío gratis */}
            {subtotal < SHIPPING_FREE_THRESHOLD && (
              <div className="checkout__shipping-banner">
                <IconTruck />
                <span>
                  Agregá <strong>{formatPrice(SHIPPING_FREE_THRESHOLD - subtotal)}</strong> más y el envío es gratis
                </span>
              </div>
            )}
            {subtotal >= SHIPPING_FREE_THRESHOLD && (
              <div className="checkout__shipping-banner checkout__shipping-banner--free">
                <IconTruck />
                <span>¡Envío gratis desbloqueado!</span>
              </div>
            )}

            <div className="checkout__actions">
              <Link to="/productos" className="checkout__btn checkout__btn--ghost">
                ← Seguir comprando
              </Link>
              <button className="checkout__btn checkout__btn--primary" onClick={handleNext}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ════ PASO 2 — Resumen + Método de pago ════ */}
        {step === 2 && (
          <div className="checkout__section fade-enter">
            <h2 className="checkout__heading">Resumen del pedido</h2>

            {/* Datos del cliente */}
            <div className="checkout__summary-card">
              <p className="checkout__summary-label">Entregar a</p>
              <p className="checkout__summary-line"><strong>{form.nombre}</strong></p>
              <p className="checkout__summary-line">{form.direccion}, {form.departamento}</p>
              <p className="checkout__summary-line">{form.telefono} · {form.email}</p>
            </div>

            {/* Lista de items */}
            <div className="checkout__items">
              {items.map((item) => (
                <div key={item.id} className="checkout__item">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="checkout__item-img" />
                  )}
                  <div className="checkout__item-info">
                    <p className="checkout__item-name">{item.name}</p>
                    <p className="checkout__item-qty">
                      {formatPrice(item.price)} × {item.quantity || 1}
                    </p>
                  </div>
                  <p className="checkout__item-sub">
                    {formatPrice(item.price * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Cupón de descuento ── */}
            <div className="checkout__coupon">
              {appliedCoupon ? (
                <div className="checkout__coupon-applied">
                  <span className="checkout__coupon-tag">
                    🎟 <strong>{appliedCoupon.code}</strong> — {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}% OFF` : `- ${formatPrice(appliedCoupon.value)}`}
                  </span>
                  <button className="checkout__coupon-remove" onClick={removeCoupon} aria-label="Quitar cupón">✕</button>
                </div>
              ) : (
                <div className="checkout__coupon-row">
                  <input
                    className="checkout__input checkout__coupon-input"
                    placeholder="Código de cupón"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && applyCoupon()}
                  />
                  <button
                    className="checkout__btn checkout__btn--ghost checkout__coupon-btn"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? "…" : "Aplicar"}
                  </button>
                </div>
              )}
              {couponError && <p className="field-error" style={{ marginTop: "0.4rem" }}>{couponError}</p>}
            </div>

            {/* Subtotal + envío + total */}
            <div className="checkout__price-breakdown">
              <div className="checkout__price-row">
                <span className="checkout__price-label">Subtotal</span>
                <span className="checkout__price-val">{formatPrice(subtotal)}</span>
              </div>
              <div className="checkout__price-row">
                <span className="checkout__price-label">
                  <IconTruck size={13} /> Envío
                </span>
                {shipping === 0
                  ? <span className="checkout__price-val checkout__price-val--free">Gratis</span>
                  : <span className="checkout__price-val">{formatPrice(shipping)}</span>
                }
              </div>
              {appliedDiscount > 0 && (
                <div className="checkout__price-row checkout__price-row--discount">
                  <span className="checkout__price-label">Descuento</span>
                  <span className="checkout__price-val checkout__price-val--discount">- {formatPrice(appliedDiscount)}</span>
                </div>
              )}
              <div className="checkout__total">
                <span className="checkout__total-label">Total</span>
                <span className="checkout__total-value">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {/* ── Método de pago ── */}
            <div className="payment-section">
              <p className="payment-section__title">Método de pago</p>
              <div className="payment-picker">
                <button
                  type="button"
                  className={`payment-picker__option${paymentMethod === "whatsapp" ? " payment-picker__option--active" : ""}`}
                  onClick={() => setPaymentMethod("whatsapp")}
                >
                  <span className="payment-picker__icon">
                    <IconWA />
                  </span>
                  <span className="payment-picker__info">
                    <span className="payment-picker__name">WhatsApp</span>
                    <span className="payment-picker__desc">Coordiná el pago por chat</span>
                  </span>
                  <span className="payment-picker__check">
                    {paymentMethod === "whatsapp" && <IconCheck />}
                  </span>
                </button>

                <button
                  type="button"
                  className={`payment-picker__option${paymentMethod === "card" ? " payment-picker__option--active" : ""}`}
                  onClick={() => setPaymentMethod("card")}
                >
                  <span className="payment-picker__icon payment-picker__icon--card">
                    <IconCard />
                  </span>
                  <span className="payment-picker__info">
                    <span className="payment-picker__name">Tarjeta</span>
                    <span className="payment-picker__desc">Débito o crédito · Pago seguro</span>
                  </span>
                  <span className="payment-picker__check">
                    {paymentMethod === "card" && <IconCheck />}
                  </span>
                </button>
              </div>

              {/* Formulario de tarjeta */}
              {paymentMethod === "card" && (
                <div className="card-form fade-enter">
                  {/* Badges con detección automática */}
                  <div className="card-form__badges">
                    <span className={`card-form__badge${cardBrand === "visa" ? " card-form__badge--active" : ""}`}>VISA</span>
                    <span className={`card-form__badge${cardBrand === "mastercard" ? " card-form__badge--active" : ""}`}>MC</span>
                    <span className={`card-form__badge${cardBrand === "amex" ? " card-form__badge--active" : ""}`}>AMEX</span>
                    <span className="card-form__badge card-form__badge--lock">
                      <IconLock /> SSL
                    </span>
                  </div>

                  <div className="card-form__field card-form__field--full">
                    <label className="checkout__label">Número de tarjeta *</label>
                    <div className="card-form__input-wrap">
                      <input
                        className={`checkout__input${cardErrors.cardNumber ? " checkout__input--error" : ""}`}
                        name="cardNumber"
                        value={card.cardNumber}
                        onChange={handleCardChange}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                      <span className="card-form__card-icon">
                        {cardBrand === "visa"       && <IconVisa />}
                        {cardBrand === "mastercard" && <IconMC />}
                        {cardBrand === "amex"       && <IconAmex />}
                        {!cardBrand                 && <IconCardMini />}
                      </span>
                    </div>
                    {cardErrors.cardNumber && <p className="field-error">{cardErrors.cardNumber}</p>}
                  </div>

                  <div className="card-form__field card-form__field--full">
                    <label className="checkout__label">Nombre en la tarjeta *</label>
                    <input
                      className={`checkout__input${cardErrors.cardName ? " checkout__input--error" : ""}`}
                      name="cardName"
                      value={card.cardName}
                      onChange={handleCardChange}
                      placeholder="Como figura en la tarjeta"
                      autoComplete="cc-name"
                    />
                    {cardErrors.cardName && <p className="field-error">{cardErrors.cardName}</p>}
                  </div>

                  <div className="card-form__row">
                    <div className="card-form__field">
                      <label className="checkout__label">Vencimiento *</label>
                      <input
                        className={`checkout__input${cardErrors.cardExpiry ? " checkout__input--error" : ""}`}
                        name="cardExpiry"
                        value={card.cardExpiry}
                        onChange={handleCardChange}
                        placeholder="MM/AA"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                      />
                      {cardErrors.cardExpiry && <p className="field-error">{cardErrors.cardExpiry}</p>}
                    </div>

                    <div className="card-form__field">
                      <label className="checkout__label">CVV *</label>
                      <input
                        className={`checkout__input${cardErrors.cardCvv ? " checkout__input--error" : ""}`}
                        name="cardCvv"
                        value={card.cardCvv}
                        onChange={handleCardChange}
                        placeholder={cardBrand === "amex" ? "1234" : "123"}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={cardBrand === "amex" ? 4 : 3}
                        type="password"
                      />
                      {cardErrors.cardCvv && <p className="field-error">{cardErrors.cardCvv}</p>}
                    </div>
                  </div>

                  <p className="card-form__notice">
                    <IconLock /> Tus datos están cifrados y protegidos. No almacenamos información de tarjeta.
                  </p>
                </div>
              )}
            </div>

            <div className="checkout__actions">
              <button className="checkout__btn checkout__btn--ghost" onClick={() => setStep(1)}>
                ← Volver
              </button>
              {paymentMethod === "whatsapp" ? (
                <button
                  className="checkout__btn checkout__btn--whatsapp"
                  onClick={handleConfirm}
                  disabled={processing}
                >
                  <IconWA />
                  Confirmar por WhatsApp
                </button>
              ) : (
                <button
                  className="checkout__btn checkout__btn--primary"
                  onClick={handleConfirm}
                  disabled={processing}
                >
                  {processing ? (
                    <><span className="checkout__spinner" /> Procesando…</>
                  ) : (
                    <><IconLock /> Pagar {formatPrice(grandTotal)}</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ PASO 3 — Confirmación ════ */}
        {step === 3 && (
          <div className="checkout__section checkout__section--confirm fade-enter">
            <div className="checkout__confirm-icon">✓</div>
            <h2 className="checkout__heading">¡Pedido confirmado!</h2>
            <p className="checkout__confirm-text">
              {paymentMethod === "whatsapp"
                ? "Tu pedido fue enviado por WhatsApp. En breve nos ponemos en contacto para coordinar la entrega y el pago."
                : "Tu pago fue procesado exitosamente. Recibirás un email de confirmación con los detalles de tu pedido y el seguimiento del envío."}
            </p>
            <button
              className="checkout__btn checkout__btn--primary"
              onClick={() => navigate("/productos")}
            >
              Seguir comprando
            </button>
          </div>
        )}

      </div>

      {/* ── Post-purchase account creation modal ───────────── */}
      {showAccountModal && (
        <div className="checkout-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="checkout-modal" onClick={e => e.stopPropagation()}>
            <button className="checkout-modal__close" onClick={() => setShowAccountModal(false)}>✕</button>
            <p className="checkout-modal__eyebrow">Un paso más</p>
            <h3 className="checkout-modal__title">Creá tu cuenta para hacer seguimiento</h3>
            <p className="checkout-modal__sub">
              Tus pedidos, favoritos y datos de envío guardados. Sin formularios la próxima vez.
            </p>
            <div className="checkout__field" style={{ marginTop: "1.2rem" }}>
              <label className="checkout__label">Email</label>
              <input className="checkout__input" value={form.email} readOnly style={{ opacity: 0.6 }} />
            </div>
            <div className="checkout__field" style={{ marginTop: "0.75rem" }}>
              <label className="checkout__label">Elegí una contraseña *</label>
              <input
                className="checkout__input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={modalPassword}
                onChange={e => { setModalPassword(e.target.value); setModalError(""); }}
              />
            </div>
            {modalError && <p className="field-error" style={{ marginTop: "0.4rem" }}>{modalError}</p>}
            <button
              className="checkout__btn checkout__btn--primary"
              style={{ width: "100%", marginTop: "1.2rem", justifyContent: "center" }}
              onClick={handleCreateAccount}
              disabled={modalLoading}
            >
              {modalLoading ? "Creando cuenta…" : "Crear cuenta gratis"}
            </button>
            <button
              className="checkout__btn checkout__btn--ghost"
              style={{ width: "100%", marginTop: "0.5rem", justifyContent: "center" }}
              onClick={() => setShowAccountModal(false)}
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────

const IconWA = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconCardMini = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconVisa = () => (
  <svg width="32" height="11" viewBox="0 0 60 20" fill="none">
    <text x="0" y="16" fontFamily="Arial" fontWeight="900" fontSize="18" fill="#1A1F71" letterSpacing="1">VISA</text>
  </svg>
);

const IconMC = () => (
  <svg width="26" height="16" viewBox="0 0 38 24">
    <circle cx="14" cy="12" r="12" fill="#EB001B"/>
    <circle cx="24" cy="12" r="12" fill="#F79E1B"/>
    <path d="M19 4.8a12 12 0 010 14.4A12 12 0 0119 4.8z" fill="#FF5F00"/>
  </svg>
);

const IconAmex = () => (
  <svg width="26" height="16" viewBox="0 0 38 24" fill="none">
    <rect width="38" height="24" rx="3" fill="#2E77BC"/>
    <text x="4" y="17" fontFamily="Arial" fontWeight="900" fontSize="11" fill="white">AMEX</text>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:"4px",flexShrink:0}}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconTruck = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:"5px",flexShrink:0}}>
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 5v4h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
