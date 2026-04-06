import React, { useState, useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";
import "../styles/LoginModal.scss";

const RegisterModal = ({ show, onClose }) => {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!show) return null;

  const handleRegister = () => {
    setError("");
    if (!name || !email || !password) {
      setError("Completa todos los campos");
      return;
    }

    register(name, email, password);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Registrarse</h2>
        {error && <p className="login-error">{error}</p>}
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          <button onClick={handleRegister}>Registrar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
