import { useState, useEffect, useContext } from "react";
import "./Navbar.scss";
import logoNavbar from "../../../assets/img/logoNabvar.png";

import { Link, useLocation } from "react-router-dom";
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
  const { count } = useCart();
  const location  = useLocation();

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escuchar evento global desde AnnouncementBar
  useEffect(() => {
    const handler = () => setShowReg(true);
    window.addEventListener("rixx:open-register", handler);
    return () => window.removeEventListener("rixx:open-register", handler);
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

          {/* ── IZQUIERDA: links 1 y 2 (+ Nosotros/Contacto si hay sesión) ── */}
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
              {isLoggedIn && (
                <>
                  <li className="navbar__link-desktop-only">
                    <Link to="/about" className={isActive("/about") ? "navbar__link--active" : ""}>
                      Nosotros
                    </Link>
                  </li>
                  <li className="navbar__link-desktop-only">
                    <Link to="/contacto" className={isActive("/contacto") ? "navbar__link--active" : ""}>
                      Contacto
                    </Link>
                  </li>
                </>
              )}
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

          {/* ── DERECHA: links 3 y 4 (solo sin sesión) + acciones ── */}
          <div className="navbar__right">
            {!isLoggedIn && (
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
            )}

            <div className="navbar__actions">
              {!isLoggedIn && (
                <button className="nav-icon-btn nav-account-btn" onClick={() => setShowLogin(true)} aria-label="Mi cuenta" data-tooltip="Mi cuenta">
                  <IconUser />
                </button>
              )}
              {isLoggedIn && !isAdmin && (
                <>
                  <Link to="/perfil" className="nav-icon-btn" aria-label="Perfil" onClick={closeMenu} data-tooltip="Perfil">
                    <IconUser />
                  </Link>
                  <Link to="/favoritos" className={`nav-icon-btn${isActive("/favoritos") ? " nav-icon-btn--active" : ""}`} aria-label="Favoritos" onClick={closeMenu} data-tooltip="Favoritos">
                    <IconHeart />
                  </Link>
                  <Link to="/mis-pedidos" className={`nav-icon-btn${isActive("/mis-pedidos") ? " nav-icon-btn--active" : ""}`} aria-label="Mis pedidos" onClick={closeMenu} data-tooltip="Mis pedidos">
                    <IconOrders />
                  </Link>
                  <button className="nav-icon-btn nav-cart" onClick={onCartClick} aria-label="Carrito" data-tooltip="Carrito">
                    <IconCart />
                    {count > 0 && <span className="nav-badge">{count}</span>}
                  </button>
                  <span className="navbar__username">{username}</span>
                </>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin" className="nav-icon-btn" aria-label="Admin" onClick={closeMenu} data-tooltip="Admin">
                    <IconGrid />
                  </Link>
                  <button className="nav-icon-btn" onClick={logout} aria-label="Cerrar sesión" data-tooltip="Cerrar sesión">
                    <IconLogout />
                  </button>
                  <span className="navbar__username">{username}</span>
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

const IconOrders = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

export default Navbar;
