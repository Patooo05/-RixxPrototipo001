import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/ProductsBanner.scss";

const ProductsBanner = ({ video }) => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const videoEl = videoRef.current;
    if (!section || !videoEl) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const sectionH = section.offsetHeight;

        // Parallax: video sube más lento que el scroll
        videoEl.style.transform = `translate(-50%, calc(-50% + ${scrollY * 0.4}px))`;

        // Fade + scale sutil conforme el banner sale de vista
        const progress = Math.min(scrollY / sectionH, 1);
        section.style.opacity = 1 - progress * 0.65;
        section.style.transform = `scale(${1 - progress * 0.04})`;

        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="products-banner" ref={sectionRef}>
      <video
        ref={videoRef}
        className="products-banner__video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={video} type="video/mp4" />
      </video>

      <div className="products-banner__overlay"></div>

      <div className="products-banner__content">
        <span className="products-banner__eyebrow">Nueva Temporada</span>
        <Link to="/productos" className="products-banner__cta">
          Ver Colección
        </Link>
      </div>
    </section>
  );
};

export default ProductsBanner;
