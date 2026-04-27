import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSEO } from "../hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import "../styles/Home.scss";
import bannerImage from "../assets/img/banner_oficcial.png";
import underCardImage from "../assets/img/3.webp";

import FeaturedProducts    from "../components/FeaturedProducts.jsx";
import BenefitsStrip      from "../components/BenefitsStrip.jsx";
import ReviewsSection      from "../components/ReviewsSection.jsx";
import NewsletterSection   from "../components/NewsletterSection.jsx";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const SLIDES = [
  {
    title: ["Nuestra", "Esencia"],
    subtitle: "Elegancia, precisión y estilo para tu experiencia visual única.",
    cta: "Descubrir colección",
  },
  {
    title: ["Nueva", "Temporada"],
    subtitle: "Los lentes que definen tu estilo. Diseño atemporal para cada momento.",
    cta: "Ver Colección",
  },
];

const INTERVAL = 7000;

const Home = () => {
  useSEO({
    title:       "RIXX — Lentes de sol premium en Uruguay",
    description: "Descubrí la colección de lentes de sol premium RIXX. Diseño, calidad y estilo. Envío a todo Uruguay.",
  });
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef(null);

  const goTo = useCallback((index) => {
    setActiveSlide(index);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDES.length);
    }, INTERVAL);
  }, []);

  const next = useCallback(() => goTo((activeSlide + 1) % SLIDES.length), [goTo, activeSlide]);
  const prev = useCallback(() => goTo((activeSlide - 1 + SLIDES.length) % SLIDES.length), [goTo, activeSlide]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => { import("../js/Home.js").then(m => m.fadeInOnScroll()); }, []);


  return (
    <main className="home">

      {/* ——— BANNER ——— */}
      <section className="banner banner--image" aria-label="Banner principal">
        <img
          src={bannerImage}
          alt="RIXX — Diseño que define, estilo que permanece"
          className="banner__bg"
          fetchPriority="high"
          loading="eager"
          decoding="sync"
        />
        <div className="banner__img-overlay" />
        <button className="banner__img-cta" onClick={() => navigate("/productos")}>
          DESCUBRÍ LA COLECCIÓN <span aria-hidden="true">→</span>
        </button>
      </section>

      {/* ——— BENEFITS STRIP ——— */}
      <BenefitsStrip />

      {/* ——— PRODUCTOS DESTACADOS ——— */}
      <FeaturedProducts />

      {/* ——— FRASE EDITORIAL ——— */}
      <span className="section-divider" />
      <section className="middle-text fade-in-on-scroll" aria-label="Frase editorial">
        <p>"Aquí el estilo es poder y la visión es tuya."</p>
      </section>
      <span className="section-divider" />

      {/* ——— RESEÑAS ——— */}
      <ReviewsSection />
      <span className="section-divider" />

      {/* ——— EDITORIAL STRIP ——— */}
      <section className="editorial-strip fade-in-on-scroll" aria-label="Tira editorial">
        <span className="editorial-strip__tag">Hecho en Uruguay — 2025</span>
        <p className="editorial-strip__text">Cada par, una declaración.</p>
      </section>

      <span className="section-divider" />

      {/* ——— UNDER-CARD BANNER ——— */}
      <section className="under-card-banner fade-in-on-scroll" aria-label="Nuevo packaging">
        <img src={underCardImage} alt="Nueva colección" className="under-banner-img" loading="lazy" />
        <div className="under-banner-overlay">
          <header className="under-header">
            <h3 className="under-title">Nuevo Packaging</h3>
            <button className="primary-btn under-btn" onClick={() => navigate("/productos")}>Ver Modelos</button>
          </header>
        </div>
      </section>

      {/* ——— NEWSLETTER ——— */}
      <span className="section-divider" />
      <NewsletterSection />

      {/* ——— CONTACTO ——— */}
      <span className="section-divider" />
      <section className="social-box fade-in-on-scroll" aria-label="Información de contacto">
        <p>Florida, Uruguay</p>
        <p><a href="https://wa.me/59898868601" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>098 868 601</a></p>
        <p>contacto@rixxlentes.com</p>
      </section>

    </main>
  );
};

export default Home;
