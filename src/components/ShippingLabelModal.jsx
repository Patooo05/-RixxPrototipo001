import { useRef } from "react";
import { createPortal } from "react-dom";
import "../styles/ShippingLabelModal.scss";

// Datos ficticios del remitente — reemplazar con los reales luego
const SENDER = {
  name:    "RIXX Lentes",
  address: "Av. 18 de Julio 1234, Apto 5",
  city:    "Montevideo, Uruguay",
  phone:   "098 868 601",
  email:   "contacto@rixxlentes.uy",
  rut:     "21.000.000-0",
};

function formatPrice(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency", currency: "UYU", maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function formatDate(str) {
  const d = str ? new Date(str) : new Date();
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ShippingLabelModal({ order, onClose }) {
  const printRef = useRef(null);

  if (!order) return null;

  const orderId   = (order.id || "").toString().slice(0, 8).toUpperCase();
  const address   = order.shipping_address || {};
  const items     = order.items || [];
  const shipping  = order.shipping ?? 0;
  const total     = order.total ?? 0;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Boleta de env\u00edo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111; }
    .sl { max-width: 600px; margin: 24px auto; border: 2px solid #111; }
    .sl__header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 2px solid #111; background: #111; color: #fff; }
    .sl__brand { font-size: 22px; font-weight: 900; letter-spacing: 0.1em; }
    .sl__doc-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin-top: 2px; }
    .sl__order-id { font-size: 13px; font-weight: 700; font-family: monospace; background: #D4AF37; color: #111; padding: 4px 10px; border-radius: 4px; }
    .sl__parties { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #111; }
    .sl__party { padding: 14px 20px; }
    .sl__party:first-child { border-right: 1px solid #111; }
    .sl__party-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; color: #666; margin-bottom: 8px; }
    .sl__party-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .sl__party-line { font-size: 12px; color: #333; line-height: 1.5; }
    .sl__items { padding: 14px 20px; border-bottom: 1px solid #ddd; }
    .sl__items-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; color: #666; margin-bottom: 8px; }
    .sl__item { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .sl__totals { padding: 10px 20px 14px; border-bottom: 2px solid #111; }
    .sl__total-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; color: #555; }
    .sl__total-row--main { font-size: 15px; font-weight: 700; color: #111; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd; }
    .sl__footer { display: flex; align-items: center; justify-content: flex-end; padding: 16px 20px; gap: 16px; }
    .sl__footer-text { font-size: 10px; color: #888; line-height: 1.6; text-align: right; }
    .sl__date { font-size: 10px; color: #888; }
  </style>
</head>
<body>${content}</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank", "width=700,height=900");
    win?.addEventListener("load", () => {
      URL.revokeObjectURL(url);
      setTimeout(() => win.print(), 300);
    });
  };

  return createPortal(
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-modal" onClick={e => e.stopPropagation()}>

        <div className="sl-modal__toolbar">
          <span className="sl-modal__toolbar-title">Boleta de envío · Preview</span>
          <div className="sl-modal__toolbar-actions">
            {order._waUrl && (
              <a
                className="sl-modal__btn sl-modal__btn--wa"
                href={order._waUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWA /> Enviar al cliente
              </a>
            )}
            <button className="sl-modal__btn sl-modal__btn--print" onClick={handlePrint}>
              <IconPrint /> Imprimir / PDF
            </button>
            <button className="sl-modal__btn sl-modal__btn--close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Etiqueta (zona imprimible) ── */}
        <div className="sl-modal__body">
          <div ref={printRef}>
            <div className="sl">

              {/* Header */}
              <div className="sl__header">
                <div>
                  <div className="sl__brand">RIXX LENTES</div>
                  <div className="sl__doc-title">Boleta de envío</div>
                </div>
                <div className="sl__order-id">#{orderId}</div>
              </div>

              {/* Remitente / Destinatario */}
              <div className="sl__parties">
                <div className="sl__party">
                  <div className="sl__party-label">Remitente</div>
                  <div className="sl__party-name">{SENDER.name}</div>
                  <div className="sl__party-line">{SENDER.address}</div>
                  <div className="sl__party-line">{SENDER.city}</div>
                  <div className="sl__party-line">{SENDER.phone}</div>
                  <div className="sl__party-line">{SENDER.email}</div>
                  <div className="sl__party-line">RUT: {SENDER.rut}</div>
                </div>
                <div className="sl__party">
                  <div className="sl__party-label">Destinatario</div>
                  <div className="sl__party-name">{order.user_name || "—"}</div>
                  {address.direccion && (
                    <div className="sl__party-line">{address.direccion}</div>
                  )}
                  {address.departamento && (
                    <div className="sl__party-line">{address.departamento}, Uruguay</div>
                  )}
                  {order.user_phone && (
                    <div className="sl__party-line">Tel: {order.user_phone}</div>
                  )}
                  {order.user_email && (
                    <div className="sl__party-line">{order.user_email}</div>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="sl__items">
                <div className="sl__items-title">Contenido del paquete</div>
                {items.map((item, i) => (
                  <div key={i} className="sl__item">
                    <span>{item.name} × {item.qty || item.quantity || 1}</span>
                    <span>{formatPrice((item.price ?? 0) * (item.qty || item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="sl__totals">
                <div className="sl__total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal ?? total)}</span>
                </div>
                <div className="sl__total-row">
                  <span>Envío</span>
                  <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="sl__total-row">
                    <span>Descuento {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                    <span>- {formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="sl__total-row sl__total-row--main">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="sl__footer" style={{ justifyContent: "flex-end" }}>
                <div className="sl__footer-text">
                  <div>Fecha: {formatDate(order.created_at)}</div>
                  <div>Pago: {order.payment_method === "whatsapp" ? "Por confirmar" : "Tarjeta"}</div>
                  <div style={{ marginTop: 8, fontSize: 9 }}>
                    Este documento es una boleta interna de envío.<br />
                    Conservarlo hasta la entrega del paquete.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  , document.body);
}

const IconWA = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
