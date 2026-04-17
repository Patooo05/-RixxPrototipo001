import React, { useState, useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../styles/AuthModals.scss";

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LoginModal = ({ show, onClose, onSwitchToRegister }) => {
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Completá todos los campos"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 280));
    const ok = await login(email, password);
    setLoading(false);
    if (ok) { setEmail(""); setPassword(""); onClose(); }
    else setError("Email o contraseña incorrectos");
  };

  const handleSwitch = () => {
    setEmail(""); setPassword(""); setError("");
    onClose();
    onSwitchToRegister?.();
  };

  const handleGuest = () => {
    onClose();
    navigate("/productos");
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">

        <button className="auth-modal__close" onClick={onClose} aria-label="Cerrar">
          <IconClose />
        </button>

        {/* Header */}
        <div className="auth-modal__header">
          <span className="auth-modal__eyebrow">Bienvenido</span>
          <h2 id="login-title" className="auth-modal__title">Accedé a <em>tu cuenta</em></h2>
          <p className="auth-modal__subtitle">Tus pedidos, favoritos y datos de envío en un solo lugar.</p>
        </div>

        {/* Form */}
        <form className="auth-modal__form" onSubmit={handleSubmit} noValidate>

          <div className="auth-modal__field">
            <label htmlFor="login-email" className="auth-modal__label">Email</label>
            <input
              id="login-email"
              className="auth-modal__input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-modal__field">
            <label htmlFor="login-password" className="auth-modal__label">Contraseña</label>
            <div className="auth-modal__input-wrap">
              <input
                id="login-password"
                className="auth-modal__input"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-modal__pwd-toggle"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          <button type="button" className="auth-modal__forgot">
            ¿Olvidaste tu contraseña?
          </button>

          {error && <p className="auth-modal__api-error" role="alert">{error}</p>}

          <button type="submit" className="auth-modal__submit" disabled={loading}>
            {loading
              ? <><span className="auth-modal__spinner" /> Ingresando…</>
              : "Ingresar"}
          </button>
        </form>

        {/* Divider + guest */}
        <div className="auth-modal__divider">
          <span>o</span>
        </div>

        <button type="button" className="auth-modal__guest-btn" onClick={handleGuest}>
          Comprá sin registrarte
        </button>

        {/* Switch */}
        <p className="auth-modal__switch">
          ¿Primera vez en RIXX?{" "}
          <button type="button" onClick={handleSwitch}>Creá tu cuenta</button>
        </p>

      </div>
    </div>
  );
};

// ── Icons ──────────────────────────────────────────────────────
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default LoginModal;
