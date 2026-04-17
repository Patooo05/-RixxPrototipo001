import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CollectionCarousel.scss";

import img2 from "../assets/img/2.webp";
import img3 from "../assets/img/3.webp";
import img5 from "../assets/img/5.webp";
import img8 from "../assets/img/8.webp";
import img7 from "../assets/img/7.webp";

const COLLECTIONS = [
  { id: 0, num: "01", label: "Colección Signature", title: "The Obsidian\nFrame", sub: "Acetato italiano premium. Para los que lideran sin esfuerzo.", accent: "#D4AF37", shape: "round", image: img2, tag: "Signature" },
  { id: 1, num: "02", label: "Colección Sport", title: "The Arctic\nShield", sub: "Lentes polarizados con montura ultraligera de titanio.", accent: "#B8962E", shape: "square", image: img3, tag: "Sport" },
  { id: 2, num: "03", label: "Colección Phantom", title: "The Quiet\nLuxury", sub: "Diseño ovalado retro-futurista. El punto de inflexión del estilo.", accent: "#E8C96A", shape: "oval", image: img5, tag: "Luxury" },
  { id: 3, num: "04", label: "Colección Avant", title: "The Gold\nEdge", sub: "Geometría angular. Carácter sin límites. Hecho para sobresalir.", accent: "#D4AF37", shape: "angular", image: img8, tag: "Limited" },
  { id: 4, num: "05", label: "Colección Drift", title: "The Silent\nStatement", sub: "Aerodinámica que se viste. Tecnología que se siente.", accent: "#99907c", shape: "wave", image: img7, tag: "New" },
];

const INTERVAL = 6000;

const GlassSVG = ({ shape, accent }) => {
  const fill = `${accent}12`;
  const strokeW = 3;

  switch (shape) {
    case "round":
      return (
        <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="40" width="148" height="80" rx="40" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <rect x="240" y="40" width="148" height="80" rx="40" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <line x1="160" y1="80" x2="240" y2="80" stroke={accent} strokeWidth="2.5" />
          <line x1="12" y1="58" x2="0" y2="28" stroke={accent} strokeWidth="2.5" />
          <line x1="388" y1="58" x2="400" y2="28" stroke={accent} strokeWidth="2.5" />
          <circle cx="86" cy="80" r="22" stroke={accent} strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />
          <circle cx="314" cy="80" r="22" stroke={accent} strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="32" width="148" height="96" rx="10" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <rect x="240" y="32" width="148" height="96" rx="10" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <line x1="160" y1="80" x2="240" y2="80" stroke={accent} strokeWidth="2.5" />
          <line x1="12" y1="50" x2="0" y2="26" stroke={accent} strokeWidth="2.5" />
          <line x1="388" y1="50" x2="400" y2="26" stroke={accent} strokeWidth="2.5" />
          <rect x="36" y="56" width="100" height="44" rx="4" stroke={accent} strokeWidth="0.8" opacity="0.3" />
          <rect x="264" y="56" width="100" height="44" rx="4" stroke={accent} strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    case "oval":
      return (
        <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="86" cy="80" rx="74" ry="48" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <ellipse cx="314" cy="80" rx="74" ry="48" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <line x1="160" y1="80" x2="240" y2="80" stroke={accent} strokeWidth="2.5" />
          <line x1="14" y1="52" x2="0" y2="28" stroke={accent} strokeWidth="2.5" />
          <line x1="386" y1="52" x2="400" y2="28" stroke={accent} strokeWidth="2.5" />
          <ellipse cx="86" cy="80" rx="40" ry="26" stroke={accent} strokeWidth="0.8" opacity="0.3" />
          <ellipse cx="314" cy="80" rx="40" ry="26" stroke={accent} strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    case "angular":
      return (
        <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="14,120 86,32 158,120" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <polygon points="242,120 314,32 386,120" stroke={accent} strokeWidth={strokeW} fill={fill} />
          <line x1="158" y1="80" x2="242" y2="80" stroke={accent} strokeWidth="2.5" />
          <line x1="14" y1="120" x2="0" y2="140" stroke={accent} strokeWidth="2.5" />
          <line x1="386" y1="120" x2="400" y2="140" stroke={accent} strokeWidth="2.5" />
        </svg>
      );
    case "wave":
    default:
      return (
        <svg viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="44" width="148" height="68" rx="68" stroke={accent} strokeWidth={strokeW} fill={fill} transform="rotate(-10 86 78)" />
          <rect x="240" y="44" width="148" height="68" rx="68" stroke={accent} strokeWidth={strokeW} fill={fill} transform="rotate(10 314 78)" />
          <line x1="160" y1="80" x2="240" y2="80" stroke={accent} strokeWidth="2.5" />
          <line x1="12" y1="58" x2="0" y2="30" stroke={accent} strokeWidth="2.5" />
          <line x1="388" y1="58" x2="400" y2="30" stroke={accent} strokeWidth="2.5" />
        </svg>
      );
  }
};

const CollectionCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const navigate = useNavigate();

  const count = COLLECTIONS.length;

  const goTo = useCallback((index) => {
    if (animating || index === current) return;
    setPrev(current);
    setAnimating(true);
    setCurrent(index);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 700);
  }, [current, animating]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % count;
        setPrev(c);
        setAnimating(true);
        setTimeout(() => { setPrev(null); setAnimating(false); }, 700);
        return next;
      });
    }, INTERVAL);
  }, [count]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  const handleNav = (dir) => {
    const next = (current + dir + count) % count;
    goTo(next);
    resetTimer();
  };

  const col = COLLECTIONS[current];

  return (
    <section className="cc" aria-label="Colecciones">
      {/* Grain texture overlay */}
      <div className="cc__grain" aria-hidden="true" />

      {/* Large background number */}
      <span className="cc__bg-num" aria-hidden="true">{col.num}</span>

      <div className="cc__inner">

        {/* LEFT: text panel */}
        <div className="cc__text-panel">
          {/* Top decorative line */}
          <div className="cc__deco-line" aria-hidden="true" />

          <div className={`cc__text-content${animating ? " cc__text-content--out" : " cc__text-content--in"}`} key={current}>
            {/* Tag badge */}
            <span className="cc__tag" style={{ borderColor: `${col.accent}55`, color: col.accent }}>
              {col.tag}
            </span>

            <span className="cc__eyebrow">{col.label}</span>

            <h2 className="cc__title">
              <span>{col.title.split("\n")[0]}</span>
              <em className="cc__title-italic" style={{ color: col.accent }}>{col.title.split("\n")[1]}</em>
            </h2>

            <p className="cc__sub">{col.sub}</p>

            <button className="cc__cta" onClick={() => navigate("/productos")} style={{ "--accent": col.accent }}>
              <span>Explorar colección</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Bottom nav */}
          <div className="cc__nav">
            <span className="cc__counter">
              <strong style={{ color: col.accent }}>{String(current + 1).padStart(2, "0")}</strong>
              <span className="cc__counter-sep">/</span>
              {String(count).padStart(2, "0")}
            </span>
            <div className="cc__nav-btns">
              <button className="cc__nav-btn" onClick={() => handleNav(-1)} aria-label="Anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <button className="cc__nav-btn" onClick={() => handleNav(1)} aria-label="Siguiente">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: visual panel */}
        <div className="cc__visual-panel">
          <div
            className={`cc__visual-content${animating ? " cc__visual-content--out" : " cc__visual-content--in"}`}
            key={`v-${current}`}
          >
            {/* Full bleed image */}
            <div className="cc__img-wrap">
              <img src={col.image} alt={col.title.replace("\n", " ")} className="cc__img" />
              {/* Gradient overlay left→transparent */}
              <div className="cc__img-overlay" style={{ "--accent": col.accent }} />
            </div>

            {/* SVG glasses floating on top */}
            <div className="cc__svg-wrap" style={{ "--accent": col.accent }}>
              <GlassSVG shape={col.shape} accent={col.accent} />
            </div>

            {/* Ambient glow */}
            <div className="cc__glow" style={{ background: `radial-gradient(ellipse at 60% 50%, ${col.accent}22 0%, transparent 65%)` }} />

            {/* Corner marks */}
            <div className="cc__corner cc__corner--tl" aria-hidden="true" />
            <div className="cc__corner cc__corner--br" aria-hidden="true" />
          </div>

          {/* Dots */}
          <div className="cc__dots">
            {COLLECTIONS.map((_, i) => (
              <button
                key={i}
                className={`cc__dot${i === current ? " cc__dot--active" : ""}`}
                onClick={() => { goTo(i); resetTimer(); }}
                aria-label={`Colección ${i + 1}`}
                style={i === current ? { background: col.accent } : {}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="cc__progress-bar">
        <div className="cc__progress-fill" key={current} style={{ "--duration": `${INTERVAL}ms`, background: col.accent }} />
      </div>
    </section>
  );
};

export default CollectionCarousel;
