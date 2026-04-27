import { useEffect, useState, useCallback, useRef } from "react";
import "../styles/CouponChip.scss";
import { useWelcomeTimer } from "../hooks/useWelcomeTimer";
import { useCart } from "./CartContext";

const TOTAL_SECS = 10 * 60;

export default function CouponChip() {
  const [code,    setCode]    = useState(null);
  const [visible, setVisible] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const { isCartOpen } = useCart();
  const { mm, ss, secs } = useWelcomeTimer();
  const dismissedRef = useRef(false);

  // Recibir código por evento
  useEffect(() => {
    const handler = (e) => {
      dismissedRef.current = false;
      setCode(e.detail?.code ?? null);
    };
    window.addEventListener("rixx:coupon-chip", handler);
    return () => window.removeEventListener("rixx:coupon-chip", handler);
  }, []);

  // Mostrar chip cuando llega el código
  useEffect(() => {
    if (code && !dismissedRef.current) setVisible(true);
  }, [code]);

  // Ocultar/mostrar según el carrito (sin borrar el código)
  useEffect(() => {
    if (!code || dismissedRef.current) return;
    setVisible(!isCartOpen);
  }, [isCartOpen, code]);

  // Auto-dismiss cuando expira el timer
  useEffect(() => {
    if (secs <= 0 && code) {
      dismissedRef.current = true;
      setVisible(false);
      const t = setTimeout(() => setCode(null), 400);
      return () => clearTimeout(t);
    }
  }, [secs, code]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setVisible(false);
    setTimeout(() => setCode(null), 400);
  }, []);

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (!code) return null;

  const pct    = Math.max(0, (secs / TOTAL_SECS) * 100);
  const urgent = secs <= 60;

  return (
    <div
      className={`coupon-chip${!visible ? " coupon-chip--out" : ""}${urgent ? " coupon-chip--urgent" : ""}`}
      role="status"
      aria-label="Cupón de bienvenida activo"
    >
      <div className="coupon-chip__glow" aria-hidden="true" />

      {/* Header */}
      <div className="coupon-chip__header">
        <span className="coupon-chip__eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          Cupón de bienvenida
        </span>
        <button className="coupon-chip__close" onClick={dismiss} aria-label="Cerrar">
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Código + copiar */}
      <div className="coupon-chip__body">
        <strong className="coupon-chip__code">{code}</strong>
        <button
          className={`coupon-chip__copy${copied ? " coupon-chip__copy--done" : ""}`}
          onClick={handleCopy}
          aria-label={`Copiar código ${code}`}
        >
          {copied ? (
            <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg><span>Copiado</span></>
          ) : (
            <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg><span>Copiar</span></>
          )}
        </button>
      </div>

      {/* Timer */}
      <div className="coupon-chip__footer">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span aria-live="polite" aria-atomic="true">
          {urgent ? `¡Expira en ${mm}:${ss}!` : `Válido por ${mm}:${ss}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="coupon-chip__bar" aria-hidden="true">
        <div className="coupon-chip__bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
