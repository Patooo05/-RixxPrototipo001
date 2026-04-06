import React, { useEffect, useState } from "react";
import "../styles/Home.scss";
import bannerVideo from "../assets/img/Bannervideo.mp4";
import underCardImage from "../assets/img/fotomontaje3.jpg";
import { fadeInOnScroll } from "../js/home";

import FeaturedProducts from "../components/FeaturedProducts.jsx";


// Importar iconos
import { FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa";

const Home = () => {
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

      {/* ——— BANNER PRINCIPAL ——— */}
      <section className="banner banner--home fade-in-on-scroll">
        <video className="banner-video" autoPlay loop muted playsInline>
          <source src={bannerVideo} type="video/mp4" />
        </video>

        <div className="banner-overlay"></div>

        <div className="banner-text fade-in-on-scroll">
          <div className="presentation-card presentation-card--over-banner">
            <h2 className="presentation-card__title">Nuestra Esencia</h2>
            <p className="presentation-card__text">
              Elegancia, precisión y estilo se combinan para tu experiencia visual única.
            </p>
          </div>
        </div>

        <div className="banner-button fade-in-on-scroll">
          <button className="primary-btn">Descubrir colección</button>
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
