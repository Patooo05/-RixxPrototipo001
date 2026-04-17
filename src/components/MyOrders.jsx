import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthContext.jsx";
import { useOrders } from "./OrdersContext.jsx";
import "../styles/MyOrders.scss";

const STATUS_LABELS = {
  pendiente:     { label: "Pendiente",    cls: "pending"   },
  confirmado:    { label: "Confirmado",   cls: "confirmed" },
  armando:       { label: "Preparando",   cls: "preparing" },
  enviado:       { label: "Enviado",      cls: "shipped"   },
  entregado:     { label: "Entregado",    cls: "delivered" },
  cancelado:     { label: "Cancelado",    cls: "cancelled" },
  reclamo:       { label: "Reclamo",      cls: "claim"     },
};

function formatPrice(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency", currency: "UYU", maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
}

export default function MyOrders() {
  const { currentUser, isLoggedIn } = useContext(AuthContext);
  const { orders, loading, getUserOrders } = useOrders();

  useEffect(() => {
    if (isLoggedIn && currentUser?.email) {
      getUserOrders(currentUser.email);
    }
  }, [isLoggedIn, currentUser?.email, getUserOrders]);

  // Filtrar órdenes del usuario actual
  const myOrders = isLoggedIn
    ? orders.filter((o) => o.user_email === currentUser?.email)
    : [];

  if (!isLoggedIn) {
    return (
      <div className="my-orders">
        <div className="my-orders__empty">
          <p className="my-orders__empty-icon">◆</p>
          <h2>Iniciá sesión</h2>
          <p>Necesitás estar logueado para ver tus pedidos.</p>
          <Link to="/" className="my-orders__btn">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-orders">
        <div className="my-orders__loading">
          <span>Cargando pedidos…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders">
      <div className="my-orders__header">
        <span className="my-orders__eyebrow">Mi cuenta</span>
        <h1 className="my-orders__title">Mis <em>pedidos</em></h1>
        <p className="my-orders__sub">
          {myOrders.length === 0
            ? "Todavía no realizaste ningún pedido."
            : `${myOrders.length} pedido${myOrders.length > 1 ? "s" : ""} registrado${myOrders.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {myOrders.length === 0 ? (
        <div className="my-orders__empty">
          <p className="my-orders__empty-icon">◆</p>
          <p>Cuando hagas tu primer pedido aparecerá acá.</p>
          <Link to="/productos" className="my-orders__btn">Ver productos</Link>
        </div>
      ) : (
        <div className="my-orders__list">
          {[...myOrders].reverse().map((order) => {
            const status = STATUS_LABELS[order.status] || { label: order.status, cls: "pending" };
            const items  = Array.isArray(order.items) ? order.items : [];
            return (
              <div key={order.id} className="order-card">
                <div className="order-card__top">
                  <div className="order-card__meta">
                    <span className="order-card__id">#{String(order.id).slice(0, 8).toUpperCase()}</span>
                    <span className="order-card__date">{formatDate(order.created_at)}</span>
                  </div>
                  <span className={`order-card__status order-card__status--${status.cls}`}>
                    {status.label}
                  </span>
                </div>

                {!["reclamo","cancelado"].includes(order.status) && (
                  <div className="order-card__progress">
                    {["confirmado","armando","enviado","entregado"].map((s, i) => {
                      const STEP_LABELS = { confirmado:"Confirmado", armando:"Preparando", enviado:"Enviado", entregado:"Entregado" };
                      const ORDER = ["confirmado","armando","enviado","entregado"];
                      const currentIdx = ORDER.indexOf(order.status);
                      const isDone = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={s} className={`order-card__step${isDone ? " order-card__step--done" : ""}${isCurrent ? " order-card__step--current" : ""}`}>
                          {i < 3 && <div className={`order-card__step-line${isDone && i < currentIdx ? " order-card__step-line--done" : ""}`} />}
                          <div className="order-card__step-dot" />
                          <span className="order-card__step-label">{STEP_LABELS[s]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="order-card__items">
                  {items.map((item, i) => (
                    <div key={i} className="order-card__item">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="order-card__item-img" />
                      )}
                      <span className="order-card__item-name">{item.name}</span>
                      <span className="order-card__item-qty">×{item.qty}</span>
                      <span className="order-card__item-price">{formatPrice(item.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card__footer">
                  <span className="order-card__shipping">
                    Envío: {[order.shipping_address?.direccion, order.shipping_address?.departamento].filter(Boolean).join(", ") || "—"}
                  </span>
                  {order.coupon_code && (
                    <span className="order-card__coupon">🎟 {order.coupon_code}</span>
                  )}
                  <span className="order-card__total">{formatPrice(order.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
