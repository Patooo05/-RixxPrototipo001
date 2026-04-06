import { Link } from "react-router-dom";
import "./Footer.scss";


const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">

        {/* LOGO + DESCRIPCIÓN */}
       <div className="footer__column footer__brand">
  <h2 className="footer__logo">RIXX</h2>

  <p className="footer__text">
    Lentes premium inspirados en estética vintage.
    Calidad, diseño y estilo en cada modelo.
  </p>



</div>


        {/* LINKS DE NAVEGACIÓN */}
        <div className="footer__column">
          <h3>Explorar</h3>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/productos">Productos</Link></li>
            <li><Link to="/colecciones">Colecciones</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </div>

        {/* INFO Y SERVICIO */}
        <div className="footer__column">
          <h3>Información</h3>
          <ul>
            <li><Link to="/envios">Envíos</Link></li>
            <li><Link to="/cambios">Cambios & Devoluciones</Link></li>
            <li><Link to="/preguntas">Preguntas Frecuentes</Link></li>
            <li><Link to="/terminos">Términos y Condiciones</Link></li>
          </ul>
        </div>

        {/* SOCIAL */}
        <div className="footer__column">
          <h3>Seguinos</h3>
          <div className="footer__social">
            <a href="#"><i className="fa-brands fa-instagram"></i></a>
            <a href="#"><i className="fa-brands fa-facebook"></i></a>
            <a href="#"><i className="fa-brands fa-tiktok"></i></a>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} RIXX — Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
