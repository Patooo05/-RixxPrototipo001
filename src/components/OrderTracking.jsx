import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/OrderTracking.scss";

// ── Configuración Supabase (raw fetch, sin cliente JS) ────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Mapa de estado → paso del stepper ─────────────────────────
const STATUS_STEP = {
  confirmado: 1,
  pendiente:  1,
  armando:    2,
  enviado:    3,
  entregado:  4,
};

const STEPS = [
  { label: "Confirmado" },
  { label: "Armando pedido" },
  { label: "Enviado" },
  { label: "Entregado" },
];

// ── Helpers ────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-UY", {
    day:   "2-digit",
    month: "long",
    year:  "numeric",
  });
}

function formatPrice(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency", currency: "UYU", maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function normalizeStatus(raw = "") {
  return raw.toLowerCase().trim();
}

// ── Icono check SVG ────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg
      className="order-tracking__step-check"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.5 6 L4.5 9 L10.5 3" stroke="#0a0a0a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Stepper ────────────────────────────────────────────────────
function OrderStepper({ currentStep }) {
  return (
    <div className="order-tracking__stepper">
      <div className="order-tracking__steps">
        {STEPS.map((step, idx) => {
          const stepNum   = idx + 1;
          const completed = stepNum < currentStep;
          const active    = stepNum === currentStep;
          const modifier  = completed ? "completed" : active ? "active" : "pending";

          return (
            <div
              key={step.label}
              className={`order-tracking__step order-tracking__step--${modifier}`}
            >
              <div className="order-tracking__step-dot">
                {completed && <CheckIcon />}
                {active    && <span className="order-tracking__step-pulse" />}
              </div>
              <span className="order-tracking__step-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Badge de estado actual */}
      <div className="order-tracking__badge-wrap">
        <span className="order-tracking__status-badge">
          <span className="order-tracking__status-dot" />
          {STEPS[(currentStep - 1)]?.label ?? "En proceso"}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function OrderTracking() {
  const { orderId } = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError(true);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    async function fetchOrder() {
      try {
        // Buscar pedido cuyo id empieza con el orderId (8 chars del UUID)
        const url = `${SUPABASE_URL}/rest/v1/orders?id=ilike.${encodeURIComponent(orderId)}*&select=*&limit=1`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            apikey:        SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          setError(true);
        } else {
          setOrder(data[0]);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("[OrderTracking] fetch error:", err);
        }
        setError(true);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    }

    fetchOrder();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [orderId]);

  // ── Calcular paso actual ──────────────────────────────────
  const statusKey  = normalizeStatus(order?.status ?? "");
  const currentStep = STATUS_STEP[statusKey] ?? 1;

  // ── Items del pedido ──────────────────────────────────────
  // Soporta tanto array como JSON string
  const rawItems = order?.items ?? [];
  const items = Array.isArray(rawItems)
    ? rawItems
    : (() => {
        try { return JSON.parse(rawItems); }
        catch { return []; }
      })();

  const subtotal = items.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.qty || 1)), 0);
  const total    = order?.total ?? subtotal;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="order-tracking">
      {/* Header */}
      <header className="order-tracking__header">
        <Link to="/" className="order-tracking__logo">RIXX</Link>
        <p className="order-tracking__tagline">Seguimiento de pedido</p>
      </header>

      <div className="order-tracking__container">

        {/* Estado: cargando */}
        {loading && (
          <div className="order-tracking__loading">
            <span className="order-tracking__spinner" />
            <span>Buscando pedido</span>
          </div>
        )}

        {/* Estado: no encontrado / error */}
        {!loading && (error || !order) && (
          <div className="order-tracking__not-found">
            <span className="order-tracking__not-found-icon">○</span>
            <h2>Pedido no encontrado</h2>
            <p>
              No encontramos un pedido con el código{" "}
              <strong className="order-tracking__not-found-code">{orderId}</strong>. Verificá el
              link o contactanos por WhatsApp.
            </p>
            <div className="order-tracking__not-found-actions">
              <Link to="/mis-pedidos" className="order-tracking__not-found-back">
                ← Mis pedidos
              </Link>
              <a
                href="https://wa.me/59898868601"
                target="_blank"
                rel="noreferrer"
                className="order-tracking__not-found-wa"
              >
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Estado: pedido encontrado */}
        {!loading && !error && order && (
          <div className="order-tracking__card">

            {/* Cabecera del pedido */}
            <div className="order-tracking__card-header">
              <span className="order-tracking__order-eyebrow">Pedido</span>
              <h1 className="order-tracking__order-id">
                #{String(order.id ?? orderId).slice(0, 8).toUpperCase()}
              </h1>
              <p className="order-tracking__order-date">{formatDate(order.created_at)}</p>
            </div>

            {/* Stepper de progreso */}
            <OrderStepper currentStep={currentStep} />

            {/* Cliente */}
            <div className="order-tracking__section">
              <p className="order-tracking__section-title">Cliente</p>
              <p className="order-tracking__customer-name">
                {order.customer_name ?? order.name ?? "—"}
              </p>
              {(order.customer_email ?? order.email) && (
                <p className="order-tracking__customer-email">
                  {order.customer_email ?? order.email}
                </p>
              )}
            </div>

            {/* Productos */}
            {items.length > 0 && (
              <div className="order-tracking__section">
                <p className="order-tracking__section-title">Productos</p>
                <div className="order-tracking__items">
                  {items.map((item, idx) => (
                    <div key={idx} className="order-tracking__item">
                      <div className="order-tracking__item-info">
                        <p className="order-tracking__item-name">
                          {item.name ?? item.title ?? `Producto ${idx + 1}`}
                        </p>
                        <p className="order-tracking__item-qty">
                          Cant. {item.qty ?? item.quantity ?? 1}
                        </p>
                      </div>
                      {item.price != null && (
                        <span className="order-tracking__item-price">
                          {formatPrice(Number(item.price) * Number(item.qty ?? item.quantity ?? 1))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="order-tracking__section">
              <p className="order-tracking__section-title">Resumen</p>
              <div className="order-tracking__totals">
                {items.length > 0 && (
                  <div className="order-tracking__total-row">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                )}
                {order.shipping_cost != null && (
                  <div className="order-tracking__total-row">
                    <span>Envío</span>
                    <span>{Number(order.shipping_cost) === 0 ? "Gratis" : formatPrice(order.shipping_cost)}</span>
                  </div>
                )}
                <div className="order-tracking__total-row order-tracking__total-row--final">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Método de pago */}
            {(order.payment_method ?? order.payment) && (
              <div className="order-tracking__section">
                <p className="order-tracking__section-title">Método de pago</p>
                <p className="order-tracking__payment">
                  <span className="order-tracking__payment-icon">◈</span>
                  <span>{order.payment_method ?? order.payment}</span>
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="order-tracking__page-footer">
        <span>¿Consultas? Escribinos por{" "}
          <a href="https://wa.me/59898868601" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </span>
      </footer>
    </div>
  );
}
