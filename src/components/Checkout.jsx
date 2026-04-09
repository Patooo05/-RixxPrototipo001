import { useState, useEffect } from "react";
import { useCart } from "./CartContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Checkout.scss";

const WHATSAPP_NUMBER = "59899000000";
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

const SESSION_KEY = "rixx_checkout_form";

// ── Helpers ───────────────────────────────────────────────────

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

function buildWhatsAppMessage(form, items, subtotal, shipping) {
  const lines = [];
  lines.push("🛒 *NUEVO PEDIDO — RIXX Lentes*");
  lines.push("─────────────────────────");
  lines.push(`👤 *Cliente:* ${form.nombre}`);
  lines.push(`📧 *Email:* ${form.email}`);
  lines.push(`📱 *Teléfono:* ${form.telefono}`);
  lines.push(`📍 *Departamento:* ${form.departamento}`);
  lines.push(`🏠 *Dirección:* ${form.direccion}`);
  if (form.notas.trim()) lines.push(`📝 *Notas:* ${form.notas}`);
  lines.push("─────────────────────────");
  lines.push("*Productos:*");
  items.forEach((item) => {
    const price = item.currentPrice ?? item.price;
    const sub = formatPrice(price * (item.quantity || 1));
    lines.push(`• ${item.name} x${item.quantity || 1} → ${sub}`);
  });
  lines.push("─────────────────────────");
  lines.push(`📦 *Envío:* ${shipping === 0 ? "Gratis" : formatPrice(shipping)}`);
  lines.push(`💰 *TOTAL: ${formatPrice(subtotal + shipping)}*`);
  lines.push("─────────────────────────");
  lines.push("_Pedido realizado desde rixx.com.uy_");
  return lines.join("\n");
}

// ── Componente ────────────────────────────────────────────────

export default function Checkout() {
  const { syncedItems: items, total: subtotal, clear } = useCart();
  const navigate = useNavigate();

  const shipping = calcShipping(subtotal);
  const grandTotal = subtotal + shipping;

  // Cargar form guardado en sessionStorage (persistencia entre pasos)
  const savedForm = (() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || EMPTY_FORM; }
    catch { return EMPTY_FORM; }
  })();

  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState(savedForm);
  const [errors, setErrors]         = useState(EMPTY_ERRORS);
  const [paymentMethod, setPaymentMethod] = useState("whatsapp");
  const [card, setCard]             = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState(EMPTY_CARD_ERRORS);
  const [sent, setSent]             = useState(false);
  const [processing, setProcessing] = useState(false);

  // Persistir form en sessionStorage en cada cambio
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(form));
  }, [form]);

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

  const handleConfirmWhatsApp = () => {
    const msg = buildWhatsAppMessage(form, items, subtotal, shipping);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    sessionStorage.removeItem(SESSION_KEY);
    clear();
    setSent(true);
    setStep(3);
  };

  const handleConfirmCard = () => {
    if (!validateCard()) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      sessionStorage.removeItem(SESSION_KEY);
      clear();
      setSent(true);
      setStep(3);
    }, 1800);
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

        {/* ── Stepper ─────────────────────────────────────── */}
        <div className="checkout__stepper">
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done    = step > n;
            const current = step === n;
            return (
              <div
                key={n}
                className={`stepper-item${current ? " stepper-item--active" : ""}${done ? " stepper-item--done" : ""}`}
              >
                <span className="stepper-item__num">{done ? "✓" : n}</span>
                <span className="stepper-item__label">{label}</span>
                {idx < STEPS.length - 1 && <span className="stepper-item__line" />}
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
