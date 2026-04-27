import { Link } from "react-router-dom";
import "./Footer.scss";

const Footer = () => (
  <footer className="footer">
    <div className="footer__grid">

      {/* Columna 1 — Brand */}
      <div className="footer__col">
        <span className="footer__wordmark">RIXX</span>
        <p className="footer__tagline">
          <em>Lentes que definen quién sos.</em>
        </p>
      </div>

      {/* Columna 2 — Navegación */}
      <div className="footer__col">
        <h4 className="footer__heading">Explorar</h4>
        <ul className="footer__list">
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/productos">Productos</Link></li>
          <li><Link to="/perfil">Mi cuenta</Link></li>
        </ul>
      </div>

      {/* Columna 3 — Contacto */}
      <div className="footer__col">
        <h4 className="footer__heading">Contacto</h4>
        <ul className="footer__list footer__list--plain">
          <li>Florida, Uruguay</li>
          <li>
            <a href="https://wa.me/59898868601" target="_blank" rel="noopener noreferrer" className="footer__phone-link" aria-label="Llamar al 098 868 601">
              098 868 601
            </a>
          </li>
          <li>
            <a href="mailto:contacto@rixxlentes.com" className="footer__phone-link" aria-label="Enviar email a contacto@rixxlentes.com">
              contacto@rixxlentes.com
            </a>
          </li>
        </ul>
      </div>

      {/* Columna 4 — RRSS solo texto */}
      <div className="footer__col">
        <h4 className="footer__heading">Seguinos</h4>
        <ul className="footer__list">
          <li><a href="https://www.instagram.com/rixx_premium_eyewear/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de RIXX">Instagram</a></li>
          <li><a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook de RIXX">Facebook</a></li>
          <li><a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok de RIXX">TikTok</a></li>
          <li><a href="https://wa.me/59898868601" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de RIXX">WhatsApp</a></li>
        </ul>
      </div>

    </div>

    <div className="footer__bottom">
      <span>© {new Date().getFullYear()} RIXX — Todos los derechos reservados.</span>
    </div>
  </footer>
);

export default Footer;
