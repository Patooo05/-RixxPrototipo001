import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";
import "./AnnouncementBar.scss";

// ── Messages ──────────────────────────────────────────────────
const GUEST_MESSAGES = [
  {
    id: "promo",
    content: (onCta) => (
      <>
        Registrate gratis&nbsp;&nbsp;
        <button className="announcement-bar__cta" onClick={onCta}>
          → 20% off en tu primera compra
        </button>
      </>
    ),
  },
  {
    id: "guarantee",
    content: () => "Garantía de 30 días · Devolución sin preguntas",
  },
  {
    id: "shipping",
    content: () => "Envío gratis llevando 2 unidades · Todo Uruguay",
  },
  {
    id: "season",
    content: () => "Nueva Temporada 2025 · Diseño atemporal para cada momento",
  },
];

const USER_MESSAGES = [
  {
    id: "guarantee",
    content: () => "Garantía de 30 días · Devolución sin preguntas",
  },
  {
    id: "shipping",
    content: () => "Envío gratis llevando 2 unidades · Todo Uruguay",
  },
  {
    id: "season",
    content: () => "Nueva Temporada 2025 · Nuevos modelos disponibles",
  },
  {
    id: "orders",
    content: () => "Seguí tus pedidos en tiempo real desde tu perfil",
  },
];

const INTERVAL   = 5000; // ms entre mensajes
const FADE_SPEED = 280;  // ms de transición

const AnnouncementBar = () => {
  const { isLoggedIn } = useContext(AuthContext);

  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("rixx_bar_dismissed") === "1"
  );
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  const messages = isLoggedIn ? USER_MESSAGES : GUEST_MESSAGES;

  // Rotación automática
  useEffect(() => {
    if (dismissed || messages.length <= 1) return;

    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, FADE_SPEED);
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [dismissed, messages.length]);

  const openRegister = () =>
    window.dispatchEvent(new CustomEvent("rixx:open-register"));

  const dismiss = () => {
    sessionStorage.setItem("rixx_bar_dismissed", "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  const msg = messages[idx % messages.length];

  return (
    <div className="announcement-bar" role="banner" aria-label="Anuncio">
      <span
        className={`announcement-bar__text${visible ? "" : " announcement-bar__text--out"}`}
      >
        {msg.content(openRegister)}
      </span>

      <button
        className="announcement-bar__dismiss"
        onClick={dismiss}
        aria-label="Cerrar anuncio"
      >
        ×
      </button>
    </div>
  );
};

export default AnnouncementBar;
