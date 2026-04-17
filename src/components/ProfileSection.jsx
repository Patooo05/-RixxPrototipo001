import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useOrders } from "./OrdersContext.jsx";

const STATUS_LABELS = {
  pendiente:  { label: "Pendiente",  color: "#e8a020" },
  confirmado: { label: "Confirmado", color: "#6ab8ff" },
  enviado:    { label: "Enviado",    color: "#D4AF37" },
  entregado:  { label: "Entregado",  color: "#4caf82" },
  cancelado:  { label: "Cancelado",  color: "#e05050" },
};

function fmtPrice(n) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" });
}

const ProfileSection = ({ section }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const { orders, loading } = useOrders();

  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  switch (section) {
    case "Información":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37" }}>Tu Información</h2>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 420 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#99907c" }}>Nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#99907c" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#99907c" }}>Rol</label>
              <input value={currentUser?.role || "—"} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: "default" }} />
            </div>

            <button type="submit" style={btnStyle}>
              {saved ? "¡Guardado!" : "Guardar cambios"}
            </button>
          </form>

          <button onClick={logout} style={{ ...btnStyle, background: "rgba(147,0,10,0.25)", color: "#ffb4ab", marginTop: "0.5rem", maxWidth: 200 }}>
            Cerrar sesión
          </button>
        </div>
      );

    case "Pedidos": {
      const myOrders = orders.filter(o => o.user_email === currentUser?.email);
      if (loading) return <p style={{ color: "#99907c" }}>Cargando pedidos…</p>;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <h2 style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37", marginBottom: "0.5rem" }}>
            Mis Pedidos
          </h2>
          {myOrders.length === 0 ? (
            <div style={{ color: "#99907c", fontSize: "0.9rem" }}>
              <p>Todavía no realizaste ningún pedido.</p>
              <Link to="/productos" style={{ color: "#D4AF37", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Ver productos →
              </Link>
            </div>
          ) : (
            [...myOrders].reverse().map(order => {
              const st = STATUS_LABELS[order.status] || { label: order.status, color: "#99907c" };
              const items = Array.isArray(order.items) ? order.items : [];
              return (
                <div key={order.id} style={{ background: "#111", border: "1px solid rgba(212,175,55,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#e5e2e1" }}>
                        #{String(order.id).slice(0,8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#99907c", marginTop: "2px" }}>{fmtDate(order.created_at)}</div>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "999px", background: `${st.color}20`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ padding: "0.6rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", color: "#99907c" }}>
                        {item.image && <img src={item.image} alt={item.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                        <span style={{ flex: 1, color: "#e5e2e1" }}>{item.name}</span>
                        <span style={{ opacity: 0.5 }}>×{item.qty}</span>
                      </div>
                    ))}
                    {items.length > 3 && <span style={{ fontSize: "11px", color: "#99907c" }}>+{items.length - 3} más</span>}
                  </div>
                  <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37", fontSize: "1rem" }}>{fmtPrice(order.total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    case "Ajustes":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 420 }}>
          <h2 style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37" }}>Ajustes</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#99907c" }}>Nueva contraseña</label>
            <input type="password" placeholder="••••••••" style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#99907c" }}>Confirmar contraseña</label>
            <input type="password" placeholder="••••••••" style={inputStyle} />
          </div>

          <button style={btnStyle}>Actualizar contraseña</button>
        </div>
      );

    default:
      return <div>Sección no encontrada</div>;
  }
};

const inputStyle = {
  padding: "0.75rem 1rem",
  background: "#050505",
  border: "none",
  borderBottom: "2px solid transparent",
  borderRadius: "0.125rem",
  color: "#e5e2e1",
  fontFamily: "Manrope, sans-serif",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.3s ease",
};

const btnStyle = {
  padding: "0.75rem 2rem",
  background: "linear-gradient(135deg, #D4AF37, #D4AF37)",
  color: "#1a1a1a",
  fontWeight: 700,
  fontFamily: "Manrope, sans-serif",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  border: "none",
  borderRadius: "0.125rem",
  cursor: "pointer",
  fontSize: "0.75rem",
  transition: "transform 0.15s ease",
};

export default ProfileSection;
