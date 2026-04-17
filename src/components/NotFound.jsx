import { Link, useNavigate } from "react-router-dom";
import "../styles/NotFound.scss";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <main className="not-found">
      <div className="not-found__inner">
        <span className="not-found__code">404</span>
        <span className="not-found__divider">◆</span>
        <h1 className="not-found__title">Página <em>no encontrada</em></h1>
        <p className="not-found__sub">
          El enlace que seguiste no existe o fue movido.
        </p>
        <div className="not-found__actions">
          <button className="not-found__btn not-found__btn--ghost" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <Link to="/productos" className="not-found__btn not-found__btn--primary">
            Ver colección
          </Link>
        </div>
      </div>
    </main>
  );
}
