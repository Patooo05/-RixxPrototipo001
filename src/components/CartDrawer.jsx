import { useRef, useState, useEffect, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/CartDrawer.scss";
import { useCart } from "./CartContext";
import { ProductsContext } from "./ProductsContext";
import { useWelcomeTimer } from "../hooks/useWelcomeTimer";

const fmt = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);

const IconTag = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);


const CartDrawer = ({ isOpen, onClose }) => {
  const {
    syncedItems, inc, dec, remove, total, shippingCost, add,
    couponCode, setCouponCode, appliedCoupon, appliedDiscount,
    couponError, couponLoading, applyCoupon, removeCoupon,
  } = useCart();
  const { products } = useContext(ProductsContext);
  const navigate = useNavigate();

  // Escuchar el chip flotante para mostrar sugerencia dentro del carrito
  const [suggestedCode, setSuggestedCode] = useState(null);
  useEffect(() => {
    const handler = (e) => setSuggestedCode(e.detail?.code ?? null);
    window.addEventListener("rixx:coupon-chip", handler);
    return () => window.removeEventListener("rixx:coupon-chip", handler);
  }, []);

  // Detectar ítems recién agregados
  const prevIdsRef = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  useEffect(() => {
    const currentIds = new Set(syncedItems.map((i) => i.id));
    const added = [...currentIds].filter((id) => !prevIdsRef.current.has(id));
    if (added.length > 0) {
      setNewIds((prev) => new Set([...prev, ...added]));
      const t = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, 550);
      prevIdsRef.current = currentIds;
      return () => clearTimeout(t);
    }
    prevIdsRef.current = currentIds;
  }, [syncedItems]);

  // Ahorro por descuentos de producto
  const savings = syncedItems.reduce((acc, item) => {
    const price = item.currentPrice ?? item.price;
    if (price < item.price) acc += (item.price - price) * item.quantity;
    return acc;
  }, 0);

  // Sugerencia cuando hay 1 ítem
  const suggestion = useMemo(() => {
    if (syncedItems.length !== 1 || !products?.length) return null;
    const cartIds = new Set(syncedItems.map((i) => i.id));
    const first = syncedItems[0];
    const available = products.filter((p) => !cartIds.has(p.id) && p.stock > 0);
    if (!available.length) return null;
    return (
      available.find((p) => p.category === first.category) ||
      available.find((p) => p.featured) ||
      available[0]
    );
  }, [syncedItems, products]);

  const { mm, ss, secs } = useWelcomeTimer();
  const timerUrgent = secs <= 60;
  const WELCOME_TOTAL_SECS = 10 * 60;

  const grandTotal = total + shippingCost - appliedDiscount;
  const isEmpty = syncedItems.length === 0;

  return (
    <>
      {isOpen && <div className="cart-overlay" onClick={onClose} aria-hidden="true" />}

      <div className={`cart-drawer${isOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Carrito de compras">

        {/* ── Header ── */}
        <div className="cart-header">
          <div className="cart-header__left">
            <h2 className="cart-header__title">Carrito</h2>
            {!isEmpty && (
              <span className="cart-header__count">{syncedItems.reduce((a, i) => a + i.quantity, 0)}</span>
            )}
          </div>
          <button className="cart-header__close" onClick={onClose} aria-label="Cerrar carrito">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Items ── */}
        <div className="cart-body">
          {isEmpty ? (
            <div className="cart-empty" role="region" aria-label="Carrito vacío">
              <div className="cart-empty__icon">
                <svg viewBox="0 0 96 44" fill="none" aria-hidden="true">
                  <circle cx="24" cy="22" r="20" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="72" cy="22" r="20" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="44" y1="22" x2="52" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4" y1="22" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="92" y1="22" x2="96" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="cart-empty__text">Tu carrito está vacío</p>
              <button className="cart-empty__cta" onClick={() => { onClose(); navigate("/productos"); }}>
                Explorar colección
              </button>
            </div>
          ) : (
            <div className="cart-items">
              {syncedItems.map((item) => {
                const price = item.currentPrice ?? item.price;
                const isOffer = price < item.price;
                return (
                  <div key={item.id} className={`cart-item${newIds.has(item.id) ? " cart-item--enter" : ""}`}>
                    {item.image && (
                      <div className="cart-item__img-wrap">
                        <img src={item.image} alt={item.name} className="cart-item__img" />
                        {isOffer && <span className="cart-item__badge">Oferta</span>}
                      </div>
                    )}
                    <div className="cart-item__body">
                      <div className="cart-item__top">
                        <h4 className="cart-item__name">{item.name}</h4>
                        <button className="cart-item__remove" onClick={() => remove(item.id)} aria-label={`Eliminar ${item.name} del carrito`}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="cart-item__bottom">
                        <div className="cart-item__qty">
                          <button onClick={() => dec(item.id)} aria-label={`Reducir cantidad de ${item.name}`}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => inc(item.id)} disabled={item.quantity >= item.maxStock} aria-label={`Aumentar cantidad de ${item.name}`}>+</button>
                        </div>
                        <div className="cart-item__prices">
                          {isOffer && <span className="cart-item__price-old">{fmt(item.price)}</span>}
                          <span className="cart-item__price-total">{fmt(price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sugerencia */}
              {suggestion && (
                <div className="cart-suggest">
                  <p className="cart-suggest__label">También te puede gustar</p>
                  <div className="cart-suggest__card">
                    {suggestion.image && (
                      <img src={suggestion.image} alt={suggestion.name} className="cart-suggest__img" />
                    )}
                    <div className="cart-suggest__info">
                      <p className="cart-suggest__name">{suggestion.name}</p>
                      <p className="cart-suggest__price">{fmt(suggestion.price)}</p>
                    </div>
                    <button
                      className="cart-suggest__add"
                      onClick={() => add({ ...suggestion, quantity: 1 })}
                      aria-label={`Agregar ${suggestion.name}`}
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!isEmpty && (
          <div className="cart-footer">

            {/* Cupón */}
            <div className="cart-coupon">
              {/* Sugerencia del chip flotante */}
              {suggestedCode && !appliedCoupon && (() => {
                const suggPct = Math.max(0, (secs / WELCOME_TOTAL_SECS) * 100);
                const showSuggTimer = suggestedCode === "RIXX001" && secs > 0;
                return (
                  <button
                    className={`cart-coupon__suggestion${showSuggTimer ? " cart-coupon__suggestion--with-timer" : ""}`}
                    onClick={() => { setCouponCode(suggestedCode); applyCoupon(total, suggestedCode); }}
                    aria-label={`Aplicar cupón ${suggestedCode}`}
                  >
                    <div className="cart-coupon__suggestion-row">
                      <IconTag />
                      <span>Aplicar <strong>{suggestedCode}</strong></span>
                      <span className="cart-coupon__suggestion-cta">Aplicar →</span>
                    </div>
                    {showSuggTimer && (
                      <>
                        <div className={`cart-coupon__chip-footer${timerUrgent ? " cart-coupon__chip-footer--urgent" : ""}`} aria-hidden="true">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {timerUrgent ? `¡Expira en ${mm}:${ss}!` : `Válido por ${mm}:${ss}`}
                        </div>
                        <div className="cart-coupon__chip-bar">
                          <div className="cart-coupon__chip-bar-fill" style={{ width: `${suggPct}%` }} />
                        </div>
                      </>
                    )}
                  </button>
                );
              })()}
              {appliedCoupon ? (() => {
                const showTimer = appliedCoupon.code === "RIXX001" && secs > 0;
                const pct = Math.max(0, (secs / WELCOME_TOTAL_SECS) * 100);
                return (
                <div className={`cart-coupon__chip cart-coupon__chip--applied${showTimer ? " cart-coupon__chip--with-timer" : ""}${showTimer && timerUrgent ? " cart-coupon__chip--urgent" : ""}`}>
                  <div className="cart-coupon__chip-row">
                    <span className="cart-coupon__chip-icon"><IconTag /></span>
                    <strong className="cart-coupon__chip-code">{appliedCoupon.code}</strong>
                    <span className="cart-coupon__chip-value">
                      {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}% off` : `−${fmt(appliedCoupon.value)}`}
                    </span>
                    <button className="cart-coupon__chip-remove" onClick={removeCoupon} aria-label="Quitar cupón">
                      <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                  {showTimer && (
                    <>
                      <div className={`cart-coupon__chip-footer${timerUrgent ? " cart-coupon__chip-footer--urgent" : ""}`} aria-live="polite" aria-atomic="true">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {timerUrgent ? `¡Expira en ${mm}:${ss}!` : `Válido por ${mm}:${ss}`}
                      </div>
                      <div className="cart-coupon__chip-bar" aria-hidden="true">
                        <div className="cart-coupon__chip-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </div>
                );
              })() : (
                <div className="cart-coupon__row">
                  <input
                    className="cart-coupon__input"
                    placeholder="Código de descuento"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && applyCoupon(total)}
                    disabled={couponLoading}
                    aria-label="Código de descuento"
                  />
                  <button className="cart-coupon__btn" onClick={() => applyCoupon(total)} disabled={couponLoading}>
                    {couponLoading && <span className="cart-coupon__spinner" aria-hidden="true" />}
                    {couponLoading ? "Aplicando" : "Aplicar"}
                  </button>
                </div>
              )}
              {couponError && <p className="cart-coupon__error">{couponError}</p>}
            </div>

            {/* Desglose */}
            <div className="cart-breakdown">
              <div className="cart-breakdown__row">
                <span>Subtotal</span>
                <span>{fmt(total)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="cart-breakdown__row cart-breakdown__row--discount">
                  <span>Descuento</span>
                  <span>−{fmt(appliedDiscount)}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="cart-breakdown__row cart-breakdown__row--savings">
                  <span>Ahorro en productos</span>
                  <span>−{fmt(savings)}</span>
                </div>
              )}
              <div className="cart-breakdown__row">
                <span>Envío</span>
                {shippingCost === 0
                  ? <span className="cart-breakdown__free">Gratis</span>
                  : <span>{fmt(shippingCost)}</span>
                }
              </div>
            </div>

            {/* Total */}
            <div className="cart-total">
              <span className="cart-total__label">Total</span>
              <span className="cart-total__val">{fmt(grandTotal)}</span>
            </div>

            <Link to="/checkout" className="cart-cta" onClick={onClose}>
              Finalizar compra
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
