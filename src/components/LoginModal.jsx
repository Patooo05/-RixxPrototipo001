import React, { useState, useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";
import "../styles/AuthModals.scss";

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LoginModal = ({ show, onClose, onSwitchToRegister }) => {
  const { login } = useContext(AuthContext);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Completá todos los campos");
      return;
    }

    setLoading(true);
    // Small tick so the loading state is visible even with sync login()
    await new Promise((r) => setTimeout(r, 300));

    const success = login(email, password);
    setLoading(false);

    if (success) {
      setEmail("");
      setPassword("");
      onClose();
    } else {
      setError("Email o contraseña incorrectos");
    }
  };

  const handleSwitch = () => {
    setEmail("");
    setPassword("");
    setError("");
    onClose();
    if (onSwitchToRegister) onSwitchToRegister();
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Iniciar sesión">

        <button className="auth-modal__close" onClick={onClose} aria-label="Cerrar">
          <IconClose />
        </button>

        <p className="auth-modal__logo">RIXX</p>
        <h2 className="auth-modal__title">Bienvenido de vuelta</h2>
        <p className="auth-modal__subtitle">Iniciá sesión para continuar</p>

        <form className="auth-modal__form" onSubmit={handleSubmit} noValidate>

          <div className="auth-modal__field">
            <label htmlFor="login-email" className="auth-modal__label">Email</label>
            <input
              id="login-email"
              className="auth-modal__input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-modal__field">
            <label htmlFor="login-password" className="auth-modal__label">Contraseña</label>
            <input
              id="login-password"
              className="auth-modal__input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="button" className="auth-modal__forgot">
            ¿Olvidaste tu contraseña?
          </button>

          {error && <p className="auth-modal__api-error">{error}</p>}

          <button
            type="submit"
            className="auth-modal__submit"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="auth-modal__switch">
          ¿No tenés cuenta?
          <button type="button" onClick={handleSwitch}>Registrate</button>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
