import { useEffect, useState, useContext, useCallback, useRef } from "react";
import { AuthContext } from "./AuthContext";
import "../styles/GuestWelcomeModal.scss";

const DELAY_MS        = 800;
const LS_KEY          = "rixx_welcome_seen";
const EXPIRY_MS       = 30 * 24 * 60 * 60 * 1000; // 30 días

export default function GuestWelcomeModal() {
  const { isLoggedIn } = useContext(AuthContext);
  const [visible,  setVisible]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn) return;
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < EXPIRY_MS) return;
      localStorage.removeItem(LS_KEY);
    }
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // Focus modal when it opens
  useEffect(() => {
    if (visible) setTimeout(() => modalRef.current?.focus(), 50);
  }, [visible]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    localStorage.setItem(LS_KEY, String(Date.now()));
    setTimeout(() => setVisible(false), 420);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, dismiss]);

  const handleRegister = useCallback(() => {
    dismiss();
    setTimeout(() => window.dispatchEvent(new Event("rixx:open-register")), 440);
  }, [dismiss]);

  if (!visible || isLoggedIn) return null;

  return (
    <div
      className={`gwm-overlay${leaving ? " gwm-overlay--out" : ""}`}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gwm-title"
    >
      <div className={`gwm${leaving ? " gwm--out" : ""}`} ref={modalRef} tabIndex={-1}>

        {/* Fondo decorativo */}
        <div className="gwm__bg" aria-hidden="true">
          <div className="gwm__bg-glow" />
          <svg className="gwm__bg-lines" viewBox="0 0 400 480" preserveAspectRatio="xMidYMid slice" fill="none">
            <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="0.4" opacity="0.18"/>
            <circle cx="200" cy="200" r="110" stroke="currentColor" strokeWidth="0.4" opacity="0.12"/>
            <line x1="200" y1="40" x2="200" y2="360" stroke="currentColor" strokeWidth="0.4" opacity="0.1"/>
            <line x1="40" y1="200" x2="360" y2="200" stroke="currentColor" strokeWidth="0.4" opacity="0.1"/>
          </svg>
        </div>

        <button className="gwm__close" onClick={dismiss} aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Eyebrow */}
        <div className="gwm__eyebrow">
          <span className="gwm__eyebrow-line" />
          <span>Bienvenido a Rixx</span>
          <span className="gwm__eyebrow-line" />
        </div>

        {/* Icono lentes */}
        <div className="gwm__icon" aria-hidden="true">
          <svg viewBox="0 0 96 44" fill="none">
            <circle cx="24" cy="22" r="19" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="72" cy="22" r="19" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="43" y1="22" x2="53" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="5" y1="22" x2="0" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="91" y1="22" x2="96" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M14 16 Q17 13 22 14" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
            <path d="M62 16 Q65 13 70 14" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>

        {/* Headline */}
        <h2 className="gwm__title" id="gwm-title">
          Creá tu cuenta y<br />
          <em>obtené un cupón de regalo</em>
        </h2>
        <p className="gwm__subtitle">
          Registrate gratis y recibís un descuento exclusivo<br />para usar en tu primera compra.
        </p>

        {/* Beneficios */}
        <ul className="gwm__perks">
          <li>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Cupón de descuento instantáneo
          </li>
          <li>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Seguimiento de tus pedidos
          </li>
          <li>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Acceso a ofertas exclusivas
          </li>
        </ul>

        {/* CTAs */}
        <button className="gwm__cta-primary" onClick={handleRegister}>
          Crear cuenta gratis
        </button>
        <button className="gwm__cta-ghost" onClick={dismiss}>
          Seguir sin registrarme
        </button>
      </div>
    </div>
  );
}
