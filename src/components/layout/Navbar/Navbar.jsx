import { useState, useEffect, useContext } from "react";
import "./Navbar.scss";
import logoNavbar from "../../../assets/img/logoNabvar.png";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../AuthContext.jsx";
import { useCart } from "../../CartContext.jsx";
import LoginModal from "../../LoginModal.jsx";
import RegisterModal from "../../RegisterModal.jsx";

const Navbar = ({ onCartClick }) => {
  const [scrolled, setScrolled]        = useState(false);
  const [menuOpen, setMenuOpen]        = useState(false);
  const [showLoginModal, setShowLogin] = useState(false);
  const [showRegisterModal, setShowReg]= useState(false);

  const { isLoggedIn, isAdmin, logout, username } = useContext(AuthContext);
  const { count }  = useCart();
  const navigate   = useNavigate();
  const location   = useLocation();

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar menu al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);


  // Helper: link activo
  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
        <div className="navbar__container">

          {/* ── IZQUIERDA: links 1 y 2 ── */}
          <div className="navbar__left">
            <ul className={`navbar__links${menuOpen ? " navbar__links--open" : ""}`}>
              <li>
                <Link to="/" className={isActive("/") ? "navbar__link--active" : ""}>
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/productos" className={isActive("/productos") ? "navbar__link--active" : ""}>
                  Productos
                </Link>
              </li>
              <li className="navbar__link-mobile-only">
                <Link to="/about" className={isActive("/about") ? "navbar__link--active" : ""}>
                  Nosotros
                </Link>
              </li>
              <li className="navbar__link-mobile-only">
                <Link to="/contacto" className={isActive("/contacto") ? "navbar__link--active" : ""}>
                  Contacto
                </Link>
              </li>
            </ul>

            {/* Iconos en mobile (junto al toggle) */}
            <div className="navbar__mobile-icons">
              {!isLoggedIn && (
                <button className="nav-icon-btn" onClick={() => setShowLogin(true)} aria-label="Cuenta">
                  <IconUser />
                </button>
              )}
              {isLoggedIn && !isAdmin && (
                <>
                  <Link to="/perfil" className="nav-icon-btn" aria-label="Perfil" onClick={closeMenu}>
                    <IconUser />
                  </Link>
                  <button className="nav-icon-btn nav-cart" onClick={onCartClick} aria-label="Carrito">
                    <IconCart />
                    {count > 0 && <span className="nav-badge">{count}</span>}
                  </button>
                </>
              )}
              {isAdmin && (
                <Link to="/admin" className="nav-icon-btn" aria-label="Admin" onClick={closeMenu}>
                  <IconGrid />
                </Link>
              )}
            </div>
          </div>

          {/* ── CENTRO: logo ── */}
          <Link to="/" className="navbar__logo" onClick={closeMenu}>
            <img src={logoNavbar} alt="Rixx" className="navbar__logo-img" />
          </Link>

          {/* ── DERECHA: links 3 y 4 + acciones ── */}
          <div className="navbar__right">
            <ul className="navbar__links navbar__links-right">
              <li>
                <Link to="/about" className={isActive("/about") ? "navbar__link--active" : ""}>
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/contacto" className={isActive("/contacto") ? "navbar__link--active" : ""}>
                  Contacto
                </Link>
              </li>
            </ul>

            <div className="navbar__actions">
              {!isLoggedIn && (
                <div className="navbar__auth-btns">
                  <button className="navbar__btn-login" onClick={() => setShowLogin(true)}>
                    Iniciar sesión
                  </button>
                  <button className="navbar__btn-register" onClick={() => setShowReg(true)}>
                    Registrarse
                  </button>
                </div>
              )}
              {isLoggedIn && !isAdmin && (
                <>
                  <span className="navbar__greeting">Hola, {username}</span>
                  <Link to="/perfil" className="nav-icon-btn" aria-label="Perfil" onClick={closeMenu}>
                    <IconUser />
                  </Link>
                  <button className="nav-icon-btn nav-cart" onClick={onCartClick} aria-label="Carrito">
                    <IconCart />
                    {count > 0 && <span className="nav-badge">{count}</span>}
                  </button>
                </>
              )}
              {isAdmin && (
                <>
                  <span className="navbar__greeting">Hola, {username}</span>
                  <Link to="/admin" className="nav-icon-btn" aria-label="Admin" onClick={closeMenu}>
                    <IconGrid />
                  </Link>
                  <button className="nav-icon-btn" onClick={logout} aria-label="Cerrar sesión">
                    <IconLogout />
                  </button>
                </>
              )}
            </div>

            {/* Toggle mobile */}
            <button
              className={`navbar__toggle${menuOpen ? " navbar__toggle--open" : ""}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú"
            >
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </button>
          </div>

        </div>
      </nav>

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => setShowReg(true)}
      />
      <RegisterModal
        show={showRegisterModal}
        onClose={() => setShowReg(false)}
        onSwitchToLogin={() => setShowLogin(true)}
      />
    </>
  );
};

/* ── SVG Icons ── */
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const IconCart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default Navbar;
