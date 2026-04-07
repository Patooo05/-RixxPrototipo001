import React, { useEffect, useState, useRef, useCallback } from "react";
import "../styles/Home.scss";
import bannerVideo from "../assets/img/Bannervideo.mp4";
// TODO: importar segundo video cuando esté disponible
// import bannerVideo2 from "../assets/img/Bannervideo2.mp4";
import underCardImage from "../assets/img/fotomontaje3.jpg";
import { fadeInOnScroll } from "../js/home";

import FeaturedProducts from "../components/FeaturedProducts.jsx";

import { FaInstagram, FaFacebookF, FaWhatsapp, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const SLIDES = [
  {
    video: bannerVideo,
    title: "Nuestra Esencia",
    subtitle: "Elegancia, precisión y estilo se combinan para tu experiencia visual única.",
    cta: "Descubrir colección",
  },
  {
    // Reemplazar `bannerVideo` por el segundo video cuando esté disponible
    video: bannerVideo,
    title: "Nueva Temporada",
    subtitle: "Los lentes que definen tu estilo. Diseño atemporal para cada momento.",
    cta: "Ver Colección",
  },
];

const INTERVAL = 7000;

const Home = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const timerRef = useRef(null);

  const goTo = useCallback((index) => {
    setPrevSlide(activeSlide);
    setActiveSlide(index);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => {
        setPrevSlide(s);
        return (s + 1) % SLIDES.length;
      });
    }, INTERVAL);
  }, [activeSlide]);

  const next = useCallback(() => goTo((activeSlide + 1) % SLIDES.length), [goTo, activeSlide]);
  const prev = useCallback(() => goTo((activeSlide - 1 + SLIDES.length) % SLIDES.length), [goTo, activeSlide]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => {
        setPrevSlide(s);
        return (s + 1) % SLIDES.length;
      });
    }, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  // Estado para reseñas dinámicas
  const [reviews, setReviews] = useState([
    "Excelente calidad y atención ⭐⭐⭐⭐⭐",
    "Los mejores lentes que he comprado!",
    "Entrega rápida y productos increíbles.",
  ]);

  const [newReview, setNewReview] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newReview.trim().length < 5) return;
    setReviews([newReview, ...reviews]);
    setNewReview("");
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  };

  useEffect(() => {
    fadeInOnScroll();
  }, []);

  return (
    <main className="home">

      {/* ——— ICONOS SOCIALES FIJOS ——— */}
      <div className="social-icons-solo">
        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
          <FaInstagram />
        </a>
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
          <FaFacebookF />
        </a>
        <a href="https://wa.me/5989900000" target="_blank" rel="noopener noreferrer">
          <FaWhatsapp />
        </a>
      </div>

      {/* ——— VIDEO CAROUSEL BANNER ——— */}
      <section className="banner banner--carousel">

        {/* ——— Capas de video (crossfade) ——— */}
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`banner__slide ${i === activeSlide ? "banner__slide--active" : ""}`}
          >
            <video autoPlay loop muted playsInline>
              <source src={slide.video} type="video/mp4" />
            </video>
          </div>
        ))}

        {/* ——— Overlay oscuro ——— */}
        <div className="banner-overlay" />

        {/* ——— Contenido del slide activo ——— */}
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`banner__content ${i === activeSlide ? "banner__content--active" : ""}`}
          >
            <div className="presentation-card">
              <h2 className="presentation-card__title">{slide.title}</h2>
              <p className="presentation-card__text">{slide.subtitle}</p>
            </div>
            <button className="primary-btn banner__cta">{slide.cta}</button>
          </div>
        ))}

        {/* ——— Flechas de navegación ——— */}
        <button className="banner__arrow banner__arrow--prev" onClick={prev} aria-label="Anterior">
          <FaChevronLeft />
        </button>
        <button className="banner__arrow banner__arrow--next" onClick={next} aria-label="Siguiente">
          <FaChevronRight />
        </button>

        {/* ——— Indicadores de puntos ——— */}
        <div className="banner__dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`banner__dot ${i === activeSlide ? "banner__dot--active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

      </section>

      {/* ——— FRASE CENTRAL ——— */}
      <section className="middle-text fade-in-on-scroll">
        <p>“Aquí el estilo es poder y la visión es tuya.”</p>
      </section>
<FeaturedProducts />
      {/* ——— UNDER-CARD BANNER ——— */}
      <section className="under-card-banner fade-in-on-scroll">
  <img
    src={underCardImage}
    alt="Nueva colección"
    className="under-banner-img"
  />

 <div className="under-banner-overlay">

  {/* ——— CABECERA ——— */}
  <header className="under-header">
    <h3 className="under-title">Nuevo Packaging </h3>
<br />
<br />
    <button className="primary-btn under-btn">
      Ver Modelos
    </button>
  </header>

  {/* ——— RESEÑAS ——— */}
  <section className="banner-reviews">
    <h4 className="reviews-title">Lo que dicen nuestros clientes</h4>

    <div className="reviews-list">
      {reviews.length > 0 ? (
        reviews.map((review, i) => (
          <article className="review-card fade-in-review" key={i}>
            <p className="review-text">{review}</p>
          </article>
        ))
      ) : (
        <p className="no-reviews">Todavía no hay reseñas.</p>
      )}
    </div>
  </section>

</div>

</section>

   <div className="review-form-box">
  <h4>¿Querés dejar tu reseña?</h4>

  <form onSubmit={handleSubmit} className="review-form">
    <textarea
      placeholder="Escribe tu experiencia..."
      value={newReview}
      onChange={(e) => setNewReview(e.target.value)}
    />

    <button className="send-btn" type="submit">
      Enviar
    </button>

    {sent && <span className="sent-message">¡Gracias por tu reseña! 💛</span>}
  </form>
</div>
      {/* ——— SOCIAL BOX ——— */}
      <section className="social-box fade-in-on-scroll">
        <p>📍 Rixx Lentes está en Florida, Uruguay.</p>
        <p>📞 09900000</p>
        <p>✉️ contacto@rixxlentes.com</p>
      </section>
    </main>
  );
};

export default Home;
