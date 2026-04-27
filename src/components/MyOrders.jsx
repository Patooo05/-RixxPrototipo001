import { useContext, useEffect, useState, useCallback } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext.jsx";
import { useOrders } from "./OrdersContext.jsx";
import "../styles/MyOrders.scss";

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pendiente:  { label: "Pendiente",   cls: "pending"   },
  confirmado: { label: "Confirmado",  cls: "confirmed" },
  armando:    { label: "Preparando",  cls: "preparing" },
  enviado:    { label: "Enviado",     cls: "shipped"   },
  entregado:  { label: "Entregado",   cls: "delivered" },
  cancelado:  { label: "Cancelado",   cls: "cancelled" },
  reclamo:    { label: "Reclamo",     cls: "claim"     },
};

const PROGRESS_STEPS = ["confirmado", "armando", "enviado", "entregado"];
const PROGRESS_LABELS = {
  confirmado: "Confirmado",
  armando:    "Preparando",
  enviado:    "Enviado",
  entregado:  "Entregado",
};

const PAYMENT_LABELS = {
  transferencia:    "Transferencia",
  "mercado-pago":   "Mercado Pago",
  "mercadopago":    "Mercado Pago",
  efectivo:         "Efectivo",
  tarjeta:          "Tarjeta",
  contraentrega:    "Contra entrega",
  whatsapp:         "WhatsApp",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPayment(method) {
  if (!method) return null;
  return PAYMENT_LABELS[method.toLowerCase()] ?? method;
}

function shortId(id) {
  return String(id ?? "").slice(0, 8).toUpperCase();
}

// ── Icono chevron ─────────────────────────────────────────────────────────────
const IconChevron = ({ open }) => (
  <svg
    className={`order-card__chevron${open ? " order-card__chevron--open" : ""}`}
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Icono tracking
const IconTracking = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

// ── Barra de progreso ─────────────────────────────────────────────────────────
function ProgressBar({ status }) {
  if (["reclamo", "cancelado"].includes(status)) return null;
  const isPending = status === "pendiente";
  const effectiveStatus = isPending ? "confirmado" : status;
  const currentIdx = PROGRESS_STEPS.indexOf(effectiveStatus);

  return (
    <div className="order-card__progress" aria-label="Estado del pedido">
      {PROGRESS_STEPS.map((step, i) => {
        const isDone    = isPending ? false : i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div
            key={step}
            className={[
              "order-card__step",
              isDone    ? "order-card__step--done"    : "",
              isCurrent ? "order-card__step--current" : "",
            ].join(" ").trim()}
          >
            {i < PROGRESS_STEPS.length - 1 && (
              <div
                className={[
                  "order-card__step-line",
                  isDone && i < currentIdx ? "order-card__step-line--done" : "",
                ].join(" ").trim()}
              />
            )}
            <div className="order-card__step-dot" />
            <span className="order-card__step-label">{PROGRESS_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tarjeta de pedido ─────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const status   = STATUS_CONFIG[order.status] ?? { label: order.status, cls: "pending" };
  const items    = Array.isArray(order.items) ? order.items : [];
  const payment  = formatPayment(order.payment_method);
  const orderId  = String(order.id ?? "");
  const trackId  = orderId.slice(0, 8);

  const handleTracking = useCallback(
    (e) => { e.stopPropagation(); navigate(`/pedido/${trackId}`); },
    [navigate, trackId]
  );

  const shippingLine = [
    order.shipping_address?.direccion,
    order.shipping_address?.departamento,
  ].filter(Boolean).join(", ");

  return (
    <article className={`order-card${open ? " order-card--open" : ""}`}>
      {/* ── Cabecera (siempre visible, clickeable) ── */}
      <button
        className="order-card__top"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Pedido #${shortId(order.id)}`}
      >
        <div className="order-card__meta">
          <span className="order-card__id">#{shortId(order.id)}</span>
          <span className="order-card__date">{formatDate(order.created_at)}</span>
        </div>

        <div className="order-card__header-right">
          <span className={`order-card__status order-card__status--${status.cls}`}>
            {status.label}
          </span>
          {payment && (
            <span className="order-card__payment">{payment}</span>
          )}
          <span className="order-card__total-preview">{formatPrice(order.total)}</span>
          <IconChevron open={open} />
        </div>
      </button>

      {/* ── Cuerpo expandible (accordion con grid-template-rows) ── */}
      <div className={`order-card__body${open ? " order-card__body--visible" : ""}`}>
        <div className="order-card__body-inner">
          {/* Barra de progreso */}
          <ProgressBar status={order.status} />

          {/* Lista de productos */}
          {items.length > 0 && (
            <div className="order-card__items">
              {items.map((item, i) => (
                <div key={i} className="order-card__item">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-card__item-img"
                      loading="lazy"
                    />
                  )}
                  <span className="order-card__item-name">{item.name}</span>
                  <span className="order-card__item-qty">×{item.qty ?? 1}</span>
                  <span className="order-card__item-price">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer: dirección, cupón, total, tracking */}
          <div className="order-card__footer">
            <div className="order-card__footer-left">
              {shippingLine && (
                <span className="order-card__shipping">
                  <span className="order-card__footer-label">Envío</span>
                  {shippingLine}
                </span>
              )}
              {order.coupon_code && (
                <span className="order-card__coupon">
                  <span className="order-card__footer-label">Cupón</span>
                  {order.coupon_code}
                </span>
              )}
              {order.shipping != null && order.shipping > 0 && (
                <span className="order-card__shipping-cost">
                  <span className="order-card__footer-label">Costo envío</span>
                  {formatPrice(order.shipping)}
                </span>
              )}
            </div>

            <div className="order-card__footer-right">
              <span className="order-card__total">{formatPrice(order.total)}</span>
              <button
                className="order-card__track-btn"
                onClick={handleTracking}
                aria-label={`Ver tracking del pedido ${shortId(order.id)}`}
              >
                <IconTracking />
                Ver tracking
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Estado vacío ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="my-orders__empty">
      <div className="my-orders__empty-icon" aria-hidden="true">◆</div>
      <h2 className="my-orders__empty-title">Tu historial está en blanco</h2>
      <p className="my-orders__empty-text">
        Cuando hagas tu primer pedido aparecerá acá.
        <br />
        ¿Qué lentes están esperando por vos?
      </p>
      <Link to="/productos" className="my-orders__btn">
        Explorar lentes
      </Link>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="order-skeleton order-skeleton--card" aria-hidden="true">
      <div className="order-skeleton__top">
        <div className="order-skeleton__line order-skeleton__line--id" />
        <div className="order-skeleton__right">
          <div className="order-skeleton__pill" />
          <div className="order-skeleton__line order-skeleton__line--price" />
        </div>
      </div>
      <div className="order-skeleton__meta">
        <div className="order-skeleton__line order-skeleton__line--date" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="my-orders__skeleton-list" role="status" aria-live="polite" aria-label="Cargando pedidos">
      <OrderSkeleton />
      <OrderSkeleton />
      <OrderSkeleton />
    </div>
  );
}

// ── No logueado ───────────────────────────────────────────────────────────────
function NotLoggedIn() {
  return (
    <div className="my-orders">
      <div className="my-orders__empty">
        <div className="my-orders__empty-icon" aria-hidden="true">◆</div>
        <h2 className="my-orders__empty-title">Iniciá sesión</h2>
        <p className="my-orders__empty-text">
          Necesitás estar logueado para ver tu historial de pedidos.
        </p>
        <Link to="/" className="my-orders__btn">Ir al inicio</Link>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MyOrders() {
  usePageTitle("Mis pedidos");
  const { currentUser, isLoggedIn } = useContext(AuthContext);
  const { orders, loading, getUserOrders } = useOrders();

  useEffect(() => {
    if (isLoggedIn && currentUser?.email) {
      getUserOrders(currentUser.email);
    }
  }, [isLoggedIn, currentUser?.email, getUserOrders]);

  if (!isLoggedIn) return <NotLoggedIn />;

  // Filtrar y ordenar: más reciente primero
  const myOrders = orders
    .filter((o) => o.user_email === currentUser?.email)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <main className="my-orders">
      {/* ── Encabezado ── */}
      <header className="my-orders__header">
        <span className="my-orders__eyebrow">Mi cuenta</span>
        <h1 className="my-orders__title">
          Mis <em>pedidos</em>
        </h1>
        {!loading && (
          <p className="my-orders__sub">
            {myOrders.length === 0
              ? "Todavía no realizaste ningún pedido."
              : `${myOrders.length} pedido${myOrders.length !== 1 ? "s" : ""} registrado${myOrders.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </header>

      {/* ── Contenido ── */}
      {loading ? (
        <LoadingState />
      ) : myOrders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="my-orders__list">
          {myOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  );
}
