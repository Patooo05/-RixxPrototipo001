import React, { useContext, useState } from "react";
import { AuthContext } from "./AuthContext";

const ProfileSection = ({ section }) => {
  const { currentUser, logout } = useContext(AuthContext);

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

    case "Pedidos":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37" }}>Mis Pedidos</h2>
          <p style={{ color: "#99907c", fontSize: "0.9rem" }}>
            Todavía no realizaste ningún pedido.
          </p>
        </div>
      );

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
