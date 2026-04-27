import { useContext, useState, useEffect } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../styles/Login.scss";

const Login = () => {
  const { login, isAdmin, isLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Navigate after context re-renders with the new user (works for both sync and async login)
  useEffect(() => {
    if (justLoggedIn && isLoggedIn) {
      navigate(isAdmin ? "/admin" : "/");
    }
  }, [justLoggedIn, isLoggedIn, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    const success = await login(email, password);

    if (success) {
      setJustLoggedIn(true);
    } else {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
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
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;
