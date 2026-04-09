import React, { useRef, useState, useEffect, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/CartDrawer.scss";
import { useCart } from "./CartContext";
import { ProductsContext } from "./ProductsContext";
import packagingImg from "../assets/img/fotomontaje3.webp";

const fmt = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);

const CartDrawer = ({ isOpen, onClose }) => {
  const { syncedItems, inc, dec, remove, total, shippingCost, add } = useCart();
  const { products } = useContext(ProductsContext);
  const navigate = useNavigate();

  // ── Mejora 1: detectar ítems recién agregados para animación de entrada ──
  const prevIdsRef = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  useEffect(() => {
    const currentIds = new Set(syncedItems.map((i) => i.id));
    const added = [...currentIds].filter((id) => !prevIdsRef.current.has(id));

    if (added.length > 0) {
      setNewIds((prev) => new Set([...prev, ...added]));
      const timer = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, 550);
      prevIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }
    prevIdsRef.current = currentIds;
  }, [syncedItems]);

  // ── Mejora 5: calcular ahorro total por descuentos ──
  const savings = syncedItems.reduce((acc, item) => {
    const price = item.currentPrice ?? item.price;
    if (price < item.price) {
      acc += (item.price - price) * item.quantity;
    }
    return acc;
  }, 0);

  // ── Sugerencia: 1 producto cuando el carrito tiene solo 1 ítem ──
  const suggestion = useMemo(() => {
    if (syncedItems.length !== 1 || !products?.length) return null;
    const cartIds = new Set(syncedItems.map((i) => i.id));
    const firstItem = syncedItems[0];
    const available = products.filter((p) => !cartIds.has(p.id) && p.stock > 0);
    if (!available.length) return null;
    // Prefiere misma categoría, luego destacado, luego primero disponible
    return (
      available.find((p) => p.category === firstItem.category) ||
      available.find((p) => p.featured) ||
      available[0]
    );
  }, [syncedItems, products]);

  // ── Mejora 9: navegar al catálogo desde estado vacío ──
  const handleExplore = () => {
    onClose();
    navigate("/productos");
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="cart-overlay" onClick={onClose} />}

      <div className={`cart-drawer${isOpen ? " open" : ""}`}>
        <div className="cart-header">
          <h2>Carrito</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar carrito">✕</button>
        </div>

        <div className="cart-content">
          {syncedItems.length === 0 ? (
            /* ── Mejora 9: estado vacío animado ── */
            <div className="cart-empty">
              <div className="cart-empty__icon-wrap">
                <svg
                  className="cart-empty__lens"
                  viewBox="0 0 96 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="24" cy="22" r="20" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="72" cy="22" r="20" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="44" y1="22" x2="52" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="4"  y1="22" x2="0"  y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="92" y1="22" x2="96" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="cart-empty__text">Tu carrito está vacío</p>
              <button className="cart-empty__cta" onClick={handleExplore}>
                Explorar colección
              </button>
            </div>
          ) : (
            syncedItems.map((item) => {
              const price = item.currentPrice ?? item.price;
              const priceChanged = price !== item.price;
              return (
                /* ── Mejora 1: clase de animación en nuevos ítems ── */
                <div
                  key={item.id}
                  className={`cart-item${newIds.has(item.id) ? " cart-item--enter" : ""}`}
                >
                  {item.image && (
                    <img src={item.image} alt={item.name} className="cart-item__img" />
                  )}
                  <div className="cart-item__info">
                    <h4 className="cart-item__name">{item.name}</h4>
                    <p className="cart-item__price">
                      {priceChanged && (
                        <span className="cart-item__price--old">{fmt(item.price)}</span>
                      )}
                      {fmt(price)}
                    </p>
                    <div className="cart-item__qty">
                      <button onClick={() => dec(item.id)} aria-label="Decrementar">−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => inc(item.id)}
                        aria-label="Incrementar"
                        disabled={item.quantity >= item.maxStock}
                      >+</button>
                    </div>
                  </div>
                  <div className="cart-item__right">
                    <p className="cart-item__sub">{fmt(price * item.quantity)}</p>
                    <button
                      className="cart-item__remove"
                      onClick={() => remove(item.id)}
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* ── Sugerencia de producto ── */}
          {suggestion && (
            <div className="cart-suggestion">
              <p className="cart-suggestion__label">También te puede gustar</p>
              <div className="cart-suggestion__card">
                {suggestion.image && (
                  <img
                    src={suggestion.image}
                    alt={suggestion.name}
                    className="cart-suggestion__img"
                  />
                )}
                <div className="cart-suggestion__info">
                  <p className="cart-suggestion__name">{suggestion.name}</p>
                  <p className="cart-suggestion__price">{fmt(suggestion.price)}</p>
                </div>
                <button
                  className="cart-suggestion__add"
                  onClick={() => add({ ...suggestion, quantity: 1 })}
                  aria-label={`Agregar ${suggestion.name} al carrito`}
                >
                  +
                </button>
              </div>
            </div>
          )}
          {/* ── Banner packaging ── */}
          <div className="cart-promo" onClick={() => { onClose(); navigate("/productos"); }}>
            <img src={packagingImg} alt="Nuevo Packaging Rixx" className="cart-promo__img" />
            <div className="cart-promo__overlay">
              <span className="cart-promo__tag">Nuevo</span>
              <p className="cart-promo__title">Packaging Premium</p>
            </div>
          </div>
        </div>

        {syncedItems.length > 0 && (
          <div className="cart-footer">
            {/* ── Mejora 5: resumen de ahorro ── */}
            {savings > 0 && (
              <p className="cart-footer__savings">
                Ahorrás {fmt(savings)} en esta compra
              </p>
            )}
            <div className="cart-footer__shipping">
              <span>Envío</span>
              {shippingCost === 0 ? (
                <span className="cart-footer__shipping--free">Gratis</span>
              ) : (
                <span>{fmt(shippingCost)}</span>
              )}
            </div>
            {shippingCost > 0 && (
              <p className="cart-footer__shipping-hint">
                Agregá 1 producto más y el envío es gratis
              </p>
            )}
            <div className="cart-footer__total">
              <span>Total</span>
              <span className="cart-footer__total-val">{fmt(total + shippingCost)}</span>
            </div>
            <Link
              to="/checkout"
              className="cart-footer__cta"
              onClick={onClose}
            >
              Ir a pagar
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
