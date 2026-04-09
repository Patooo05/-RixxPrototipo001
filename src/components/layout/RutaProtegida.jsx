import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../AuthContext.jsx";

/**
 * Wrapper que protege rutas privadas.
 * - Si !isLoggedIn → redirige a /
 * - Si adminOnly && !isAdmin → redirige a /
 * - Si isLoggedIn → renderiza children
 */
const RutaProtegida = ({ children, adminOnly = false }) => {
  const { isLoggedIn, isAdmin } = useContext(AuthContext);

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RutaProtegida;
