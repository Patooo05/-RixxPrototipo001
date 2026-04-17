import { useState, useEffect, useRef } from "react";
import { useReviews } from "./ReviewsContext";
import "../styles/ReviewsSection.scss";

// ── #6 Helper: relative date ──────────────────────────────────────────────────
const relativeDate = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  if (days < 365) return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? "es" : ""}`;
  return `hace ${Math.floor(days / 365)} año${Math.floor(days / 365) > 1 ? "s" : ""}`;
};

// ── #9 + #8 Helper: render comment with highlight and word stagger ─────────────
const renderComment = (text, highlight, isActive) => {
  // Split text into parts, marking highlight occurrences
  const parts = highlight
    ? text.split(new RegExp(`(${highlight})`, "i"))
    : [text];

  let wordIndex = 0;

  return parts.map((part, partIdx) => {
    const isHighlight =
      highlight && part.toLowerCase() === highlight.toLowerCase();

    if (!isActive) {
      // Non-active card: render plain text, mark highlight if present
      return isHighlight ? (
        <span key={partIdx} className="reviews__highlight">
          {part}
        </span>
      ) : (
        part
      );
    }

    // Active card: split each part into words and apply stagger animation (#8)
    const words = part.split(/(\s+)/);
    return words.map((word) => {
      if (/^\s+$/.test(word) || word === "") {
        // Preserve whitespace as-is
        const key = `ws-${partIdx}-${wordIndex}`;
        wordIndex++;
        return <span key={key}>{word}</span>;
      }
      const delay = wordIndex * 0.03 + "s";
      const key = `w-${partIdx}-${wordIndex}`;
      wordIndex++;
      return (
        <span
          key={key}
          className={
            isHighlight
              ? "reviews__word reviews__highlight"
              : "reviews__word"
          }
          style={{ animationDelay: delay }}
        >
          {word}
        </span>
      );
    });
  });
};

// ── Star primitives ───────────────────────────────────────────────────────────
const StarIcon = ({ filled }) => (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarRating = ({ rating }) => (
  <div className="reviews__stars" aria-label={`${rating} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <StarIcon key={i} filled={i <= rating} />
    ))}
  </div>
);

// ── #10 Interactive star selector for the form ────────────────────────────────
const StarSelector = ({ value, onChange }) => (
  <div className="reviews__form-stars">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        className={`reviews__form-star${i <= value ? " reviews__form-star--active" : ""}`}
        onClick={() => onChange(i)}
        aria-label={`${i} estrella${i > 1 ? "s" : ""}`}
      >
        <StarIcon filled={i <= value} />
      </button>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ReviewsSection = () => {
  const { reviews, loading, addReview } = useReviews();
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const carouselRef = useRef(null);

  // #10 Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    author_name: "",
    rating: 5,
    comment: "",
    product_name: "",
  });
  const [formSent, setFormSent] = useState(false);

  // Demo reviews with created_at so relative dates work
  const DEMO = [
    {
      id: "d1",
      author_name: "Martina R.",
      rating: 5,
      comment:
        "Los mejores lentes que usé en mi vida. La calidad se siente desde el primer momento. Los uso todos los días.",
      product_name: "Nova",
      approved: true,
      source: "customer",
      highlight: "calidad",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "d2",
      author_name: "Lucas M.",
      rating: 5,
      comment:
        "Diseño increíble, materiales de primera. Recibí muchos comentarios desde que los tengo. 100% recomendados.",
      product_name: "Core",
      approved: true,
      source: "customer",
      highlight: "Diseño increíble",
      created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
    },
    {
      id: "d3",
      author_name: "Valentina S.",
      rating: 5,
      comment:
        "Compré el Vector y quedé enamorada. El empaque es de lujo y la atención fue perfecta.",
      product_name: "Vector",
      approved: true,
      source: "customer",
      highlight: "lujo",
      created_at: new Date(Date.now() - 33 * 86400000).toISOString(),
    },
  ];

  const approved = reviews.filter((r) => r.approved);
  const items = approved.length > 0 ? approved : DEMO;
  const total = items.length;
  const current = active % total;

  // #4 Average rating
  const avgRating =
    items.length > 0
      ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1)
      : "5.0";

  // Timer helpers (#5 pause on hover)
  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setActive((a) => (a + 1) % total),
      5000
    );
  };

  const goTo = (i) => {
    setActive(i);
    startTimer();
  };

  useEffect(() => {
    if (total > 0) startTimer();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // #5 Pause/resume on hover
  const handleMouseEnter = () => clearInterval(timerRef.current);
  const handleMouseLeave = () => startTimer();

  // #10 Form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.author_name || !formData.comment) return;
    await addReview({
      ...formData,
      approved: false,
      source: "customer",
    });
    setFormSent(true);
    setFormData({ author_name: "", rating: 5, comment: "", product_name: "" });
    setTimeout(() => {
      setFormSent(false);
      setFormOpen(false);
    }, 4000);
  };

  return (
    <section
      className="reviews fade-in-on-scroll"
      aria-label="Reseñas de clientes"
    >
      {/* ── Header with overall rating (#4) ─────────────────────────── */}
      <header className="reviews__header">
        <span className="reviews__eyebrow">Lo que dicen nuestros clientes</span>
        <h2 className="reviews__title">
          Reseñas <em>reales</em>
        </h2>
        <div className="reviews__gold-line" aria-hidden="true" />
        <p className="reviews__avg">
          <span className="reviews__avg-star">★</span>
          <strong>{avgRating}</strong>
          <span className="reviews__avg-count">
            &nbsp;·&nbsp;{items.length} reseña{items.length !== 1 ? "s" : ""}
          </span>
        </p>
      </header>

      {/* ── Carousel (#1 three-card depth, #5 pause on hover) ────────── */}
      <div
        className="reviews__carousel"
        ref={carouselRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="reviews__track">
          {items.map((r, i) => {
            const pos =
              i === current
                ? "active"
                : i === (current - 1 + total) % total
                ? "prev"
                : i === (current + 1) % total
                ? "next"
                : "hidden";
            const isActive = pos === "active";

            return (
              <article
                key={r.id}
                className={`reviews__card reviews__card--${pos}`}
                aria-hidden={!isActive}
              >
                <div className="reviews__card-inner">
                  {/* #2 Avatar with initial letter */}
                  <div className="reviews__avatar" aria-hidden="true">
                    {r.author_name.charAt(0).toUpperCase()}
                  </div>

                  <StarRating rating={r.rating} />

                  {/* #8 + #9 Comment with word stagger and highlight */}
                  <p className="reviews__comment">
                    {renderComment(r.comment, r.highlight, isActive)}
                  </p>

                  <footer className="reviews__author">
                    <div className="reviews__author-info">
                      <span className="reviews__author-name">
                        {r.author_name}
                      </span>
                      {r.product_name && (
                        <span className="reviews__author-product">
                          — {r.product_name}
                        </span>
                      )}
                    </div>

                    <div className="reviews__author-meta">
                      {/* #7 Verified purchase badge */}
                      {r.source === "customer" && (
                        <span className="reviews__verified">
                          <svg
                            aria-hidden="true"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Compra verificada
                        </span>
                      )}
                      {/* #6 Relative date */}
                      {r.created_at && (
                        <span className="reviews__date">
                          {relativeDate(r.created_at)}
                        </span>
                      )}
                    </div>
                  </footer>

                  {/* #3 Animated progress bar */}
                  {isActive && (
                    <div className="reviews__progress" aria-hidden="true">
                      <div
                        className="reviews__progress-fill"
                        key={current}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="reviews__nav">
          <button
            className="reviews__nav-btn"
            onClick={() => goTo((current - 1 + total) % total)}
            aria-label="Anterior"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="reviews__dots">
            {items.map((_, i) => (
              <button
                key={i}
                className={`reviews__dot${i === current ? " reviews__dot--active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Reseña ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="reviews__nav-btn"
            onClick={() => goTo((current + 1) % total)}
            aria-label="Siguiente"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="reviews__counter" aria-live="polite">
          <strong>{String(current + 1).padStart(2, "0")}</strong> /{" "}
          {String(total).padStart(2, "0")}
        </p>
      </div>

      {/* ── #10 Collapsible "Leave a review" form ────────────────────── */}
      <div className="reviews__form-section">
        {!formOpen && !formSent && (
          <button
            className="reviews__form-toggle"
            onClick={() => setFormOpen(true)}
          >
            Dejanos tu reseña
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {formSent && (
          <p className="reviews__form-success">
            ¡Gracias por tu reseña! La revisaremos pronto.
          </p>
        )}

        {formOpen && !formSent && (
          <form
            className="reviews__form"
            onSubmit={handleFormSubmit}
            noValidate
          >
            <h3 className="reviews__form-title">Tu experiencia</h3>

            <div className="reviews__form-row">
              <input
                className="reviews__form-input"
                type="text"
                placeholder="Tu nombre *"
                value={formData.author_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, author_name: e.target.value }))
                }
                required
              />
              <input
                className="reviews__form-input"
                type="text"
                placeholder="Producto (opcional)"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, product_name: e.target.value }))
                }
              />
            </div>

            <StarSelector
              value={formData.rating}
              onChange={(v) => setFormData((p) => ({ ...p, rating: v }))}
            />

            <textarea
              className="reviews__form-textarea"
              placeholder="Contanos tu experiencia *"
              rows={4}
              value={formData.comment}
              onChange={(e) =>
                setFormData((p) => ({ ...p, comment: e.target.value }))
              }
              required
            />

            <div className="reviews__form-actions">
              <button
                type="button"
                className="reviews__form-cancel"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="reviews__form-submit">
                Enviar reseña
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;
