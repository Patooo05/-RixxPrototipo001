import { Link, useNavigate } from "react-router-dom";
import "../styles/NotFound.scss";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <main className="not-found">
      <div className="not-found__glow" aria-hidden="true" />
      <div className="not-found__inner">
        <span className="not-found__eyebrow">Error 404</span>
        <span className="not-found__code" aria-hidden="true">404</span>
        <span className="not-found__divider">◆</span>
        <h1 className="not-found__title">No encontramos <em>lo que buscás</em></h1>
        <p className="not-found__sub">
          El link puede haber caducado o la URL está mal escrita.
        </p>
        <div className="not-found__actions">
          <Link to="/productos" className="not-found__btn not-found__btn--primary">
            Ver colección
          </Link>
          <Link to="/" className="not-found__btn not-found__btn--secondary">
            Ir al inicio
          </Link>
          <button className="not-found__btn not-found__btn--ghost" onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>
      </div>
    </main>
  );
}
