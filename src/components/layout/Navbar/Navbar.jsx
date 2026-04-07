import React, { useState, useEffect, useContext } from "react";
import "./Navbar.scss";
import logoIntro from "../../../assets/img/logoIntro.png";
import logoNavbar from "../../../assets/img/logoNabvar.png";

import { setupNavbarSequence } from "../../../js/Navbar.js";

import cartIcon from "../../../assets/img/carrito.png";
import adminIcon from "../../../assets/img/Admin.svg";
import userIcon from "../../../assets/img/User.svg";

import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../AuthContext.jsx";
import { useCart } from "../../CartContext.jsx";
import LoginModal from "../../LoginModal.jsx";
import RegisterModal from "../../RegisterModal.jsx";

const Navbar = ({ onCartClick }) => {
  const [showLogoSolo, setShowLogoSolo] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { isLoggedIn, username, isAdmin, logout } = useContext(AuthContext);
  const { count } = useCart();

  const [welcomeFragments, setWelcomeFragments] = useState([]);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const navigate = useNavigate();

  // Mini barra bienvenida y secuencia navbar
  useEffect(() => {
    setWelcomeFragments(
      isAdmin
        ? [{ text: "Administrador Online", highlight: "blink-slow" }]
        : [{ text: "Bienvenido a Rixx: estilo y visión es tuya.", highlight: false }]
    );

    let timerText;
    if (!isAdmin) {
      timerText = setTimeout(() => {
        setWelcomeFragments([
          { text: "¡Estas de ", highlight: false },
          { text: "SUERTE", highlight: "blink-slow" },
          { text: ": 2 de cada 20 clientes obtienen: Envío ", highlight: false },
          { text: "GRATIS", highlight: "blink-medium" },
          { text: " estas 24hs + ", highlight: false },
          { text: "15% de Descuento", highlight: "blink-fast" },
          { text: "!", highlight: false },
        ]);
      }, 10000);
    }

    const cleanupSequence = setupNavbarSequence(() => {}, setShowLogoSolo, setShowNavbar);

    return () => {
      timerText && clearTimeout(timerText);
      cleanupSequence && cleanupSequence();
    };
  }, [isAdmin]);

  // Redirección al admin solo al iniciar sesión
  useEffect(() => {
    if (isLoggedIn && isAdmin && !justLoggedIn) {
      setJustLoggedIn(true);

      const redirectTimer = setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [isLoggedIn, isAdmin, navigate, justLoggedIn]);

  return (
    <>
      {/* Mini barra bienvenida */}
      <div className="navbar__welcome">
        {welcomeFragments.map((frag, index) => (
          <span
            key={index}
            className={frag.highlight ? `highlight-welcome ${frag.highlight}` : ""}
          >
            {frag.text}
          </span>
        ))}
      </div>

      {/* Logo solo */}
      {showLogoSolo && (
        <div className="logo-solo fade-in">
          <img src={logoIntro} alt="Rixx Logo" />
        </div>
      )}

      {/* Navbar principal */}
      {showNavbar && (
        <nav className="navbar fade-in-navbar">
          <div className="navbar__container">
            <Link to="/" className="navbar__logo logo-nav visible">
              <img src={logoNavbar} alt="Rixx Lentes" className="navbar__logo-img" />
            </Link>

            <button className="navbar__toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>

            <ul className={`navbar__links links-visible ${menuOpen ? "active" : ""}`}>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link></li>
              <li><Link to="/productos" onClick={() => setMenuOpen(false)}>Productos</Link></li>
              <li><Link to="/about" onClick={() => setMenuOpen(false)}>Nosotros</Link></li>
              <li><Link to="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link></li>
            </ul>

            <div className="navbar__actions actions-visible">
              {/* Usuario no logueado */}
              {!isLoggedIn && (
                <>
                  <button className="user-text" onClick={() => setShowLoginModal(true)}>Iniciar sesión</button>
                  <button className="register-btn" onClick={() => setShowRegisterModal(true)}>Registrarse</button>
                </>
              )}

              {/* Usuario logueado */}
              {isLoggedIn && (
                <>
                  <Link to="/perfil" className="profile-icon">
                    <img src={userIcon} alt="Perfil" />
                  </Link>

                  <span className="username">{username}</span>
                  <button onClick={logout} className="user-btn">Cerrar sesión</button>
                </>
              )}

              {/* Admin */}
              {isAdmin && (
                <Link to="/admin" className="admin">
                  <img src={adminIcon} alt="Admin" className="icon" />
                </Link>
              )}

              {/* Carrito solo usuarios normales */}
              {!isAdmin && isLoggedIn && (
                <button className="cart1" onClick={onCartClick}>
                  <img src={cartIcon} alt="Carrito" className="icon" />
                  {count > 0 && <span className="cart-badge">{count}</span>}
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Modales */}
      <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <RegisterModal show={showRegisterModal} onClose={() => setShowRegisterModal(false)} />
    </>
  );
};

export default Navbar;
