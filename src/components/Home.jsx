import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.scss";
import bannerVideo   from "../assets/img/Bannervideo.mp4";
import underCardImage from "../assets/img/fotomontaje3.webp";
import { fadeInOnScroll } from "../js/home";

import FeaturedProducts    from "../components/FeaturedProducts.jsx";
import CollectionCarousel  from "../components/CollectionCarousel.jsx";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const SLIDES = [
  {
    video: bannerVideo,
    title: ["Nuestra", "Esencia"],
    subtitle: "Elegancia, precisión y estilo para tu experiencia visual única.",
    cta: "Descubrir colección",
  },
  {
    video: bannerVideo,
    title: ["Nueva", "Temporada"],
    subtitle: "Los lentes que definen tu estilo. Diseño atemporal para cada momento.",
    cta: "Ver Colección",
  },
];

const INTERVAL = 7000;

const Home = () => {
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

  useEffect(() => { fadeInOnScroll(); }, []);

  return (
    <main className="home">

      {/* ——— VIDEO BANNER ——— */}
      <section className="banner banner--carousel">
        {/* Un solo video — evita cargar el mismo archivo N veces */}
        <div className="banner__slide banner__slide--active">
          <video autoPlay loop muted playsInline poster={underCardImage} preload="auto">
            <source src={bannerVideo} type="video/mp4" />
          </video>
        </div>

        <div className="banner-overlay" />

        {SLIDES.map((slide, i) => (
          <div key={i} className={`banner__content${i === activeSlide ? " banner__content--active" : ""}`}>
            <div className="presentation-card">
              <h2 className="presentation-card__title">
                <em>{slide.title[0]}</em> {slide.title[1]}
              </h2>
              <p className="presentation-card__text">{slide.subtitle}</p>
            </div>
            <button className="primary-btn banner__cta" onClick={() => navigate("/productos")}>{slide.cta}</button>
          </div>
        ))}

        <button className="banner__arrow banner__arrow--prev" onClick={prev} aria-label="Anterior">
          <FaChevronLeft />
        </button>
        <button className="banner__arrow banner__arrow--next" onClick={next} aria-label="Siguiente">
          <FaChevronRight />
        </button>

        <div className="banner__dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`banner__dot${i === activeSlide ? " banner__dot--active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ——— FRASE EDITORIAL ——— */}
      <span className="section-divider" />
      <section className="middle-text fade-in-on-scroll">
        <p>"Aquí el estilo es poder y la visión es tuya."</p>
      </section>
      <span className="section-divider" />

      {/* ——— PRODUCTOS DESTACADOS ——— */}
      <FeaturedProducts />

      {/* ——— COLLECTION CAROUSEL ——— */}
      <span className="section-divider" />
      <CollectionCarousel />
      <span className="section-divider" />

      {/* ——— EDITORIAL STRIP ——— */}
      <section className="editorial-strip fade-in-on-scroll">
        <span className="editorial-strip__tag">Hecho en Uruguay — 2025</span>
        <p className="editorial-strip__text">Cada par, una declaración.</p>
      </section>

      <span className="section-divider" />

      {/* ——— UNDER-CARD BANNER ——— */}
      <section className="under-card-banner fade-in-on-scroll">
        <img src={underCardImage} alt="Nueva colección" className="under-banner-img" />
        <div className="under-banner-overlay">
          <header className="under-header">
            <h3 className="under-title">Nuevo Packaging</h3>
            <button className="primary-btn under-btn" onClick={() => navigate("/productos")}>Ver Modelos</button>
          </header>
        </div>
      </section>

      {/* ——— CONTACTO ——— */}
      <span className="section-divider" />
      <section className="social-box fade-in-on-scroll">
        <p>Florida, Uruguay</p>
        <p><a href="https://wa.me/59899000000" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>099 000 000</a></p>
        <p>contacto@rixxlentes.com</p>
      </section>

    </main>
  );
};

export default Home;
