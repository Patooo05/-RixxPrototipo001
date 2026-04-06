import React, { useState, useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";
import "../styles/LoginModal.scss";

const LoginModal = ({ show, onClose }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!show) return null;

  const handleLogin = () => {
    setError("");
    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    const success = login(email, password);
    if (success) onClose();
    else setError("Credenciales inválidas");
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Iniciar sesión</h2>
        {error && <p className="login-error">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="modal-buttons">
          <button onClick={handleLogin}>Ingresar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
