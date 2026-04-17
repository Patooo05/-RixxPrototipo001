import { useState } from "react";
import { createPortal } from "react-dom";
import "../styles/ShippingNotifyModal.scss";

function toWaNumber(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.startsWith("598") ? d : `598${d.replace(/^0/, "")}`;
}

export default function ShippingNotifyModal({ order, onClose, onConfirm }) {
  const [agencia,       setAgencia]       = useState("");
  const [agenciaManual, setAgenciaManual] = useState("");
  const [detalles,      setDetalles]      = useState("");

  if (!order) return null;

  const nombre  = order.user_name ? ` ${order.user_name}` : "";
  const orderId = (order.id || "").toString().slice(0, 8).toUpperCase();
  const addr    = order.shipping_address || {};
  const dirLine = addr.direccion ? `📍 ${addr.direccion}${addr.departamento ? `, ${addr.departamento}` : ""}` : "";

  const agenciaFinal = agencia === "otra" ? agenciaManual.trim() : agencia;

  const buildMsg = () => {
    const lines = [
      `📦 ¡Hola${nombre}! Tu pedido *#${orderId}* ya está en camino.`,
      ``,
    ];
    if (dirLine) {
      lines.push(`Tu paquete fue despachado hacia:`);
      lines.push(dirLine);
      lines.push(``);
    }
    if (agenciaFinal) {
      lines.push(`🚚 *Agencia de envío:* ${agenciaFinal}`);
    }
    if (detalles.trim()) {
      lines.push(`📋 *Detalles:* ${detalles.trim()}`);
    }
    if (agenciaFinal || detalles.trim()) lines.push(``);
    lines.push(`Si tenés alguna consulta, escribinos por acá. 🙌`);
    lines.push(``);
    lines.push(`¡Gracias por tu compra!`);
    lines.push(`*RIXX Lentes* 🕶️`);
    return lines.join("\n");
  };

  const handleSend = () => {
    const msg = buildMsg();
    const url = `https://wa.me/${toWaNumber(order.user_phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onConfirm();
  };

  return createPortal(
    <div className="snm-overlay" onClick={onClose}>
      <div className="snm" onClick={e => e.stopPropagation()}>

        <div className="snm__header">
          <div>
            <p className="snm__eyebrow">Pedido #{orderId}</p>
            <h3 className="snm__title">Notificar envío al cliente</h3>
          </div>
          <button className="snm__close" onClick={onClose}>✕</button>
        </div>

        <div className="snm__body">
          <div className="snm__field">
            <label className="snm__label">Agencia de envío</label>
            <select
              className="snm__input snm__select"
              value={agencia}
              onChange={e => { setAgencia(e.target.value); setAgenciaManual(""); }}
            >
              <option value="">— Seleccioná una agencia —</option>
              <option value="Turismar">Turismar</option>
              <option value="DAC">DAC</option>
              <option value="otra">Otra (escribir)</option>
            </select>
            {agencia === "otra" && (
              <input
                className="snm__input"
                placeholder="Nombre de la agencia..."
                value={agenciaManual}
                onChange={e => setAgenciaManual(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="snm__field">
            <label className="snm__label">Detalles del envío <span className="snm__optional">(opcional)</span></label>
            <input
              className="snm__input"
              placeholder="Ej: Número de seguimiento, fecha estimada..."
              value={detalles}
              onChange={e => setDetalles(e.target.value)}
            />
          </div>

          {/* Preview del mensaje */}
          <div className="snm__preview-wrap">
            <p className="snm__preview-label">Vista previa del mensaje</p>
            <pre className="snm__preview">{buildMsg()}</pre>
          </div>
        </div>

        <div className="snm__tip">
          <span className="snm__tip-icon">📎</span>
          Una vez abierto el chat, adjuntá la <strong>foto del comprobante</strong> antes de enviar el mensaje.
        </div>

        <div className="snm__footer">
          <button className="snm__btn snm__btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="snm__btn snm__btn--wa"
            onClick={handleSend}
            disabled={!order.user_phone}
          >
            <IconWA /> Enviar por WhatsApp
          </button>
        </div>

      </div>
    </div>
  , document.body);
}

const IconWA = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
