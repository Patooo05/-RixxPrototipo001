import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import "../styles/ProductReviews.scss";

// ── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

/**
 * Formats a date string to Spanish long format.
 * e.g. "2025-03-12T..." → "12 de marzo de 2025"
 */
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Computes a summary object from a reviews array.
 */
const computeSummary = (reviews) => {
  const total = reviews.length;
  if (total === 0) return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };

  const distribution = [0, 0, 0, 0, 0]; // index 0 = 1★, index 4 = 5★
  let sum = 0;
  reviews.forEach((r) => {
    const s = Math.min(5, Math.max(1, Math.round(r.rating)));
    distribution[s - 1]++;
    sum += s;
  });

  return {
    average: (sum / total).toFixed(1),
    total,
    distribution, // [count1★, count2★, count3★, count4★, count5★]
  };
};

// ── Sub-components ─────────────────────────────────────────────────────────

/** Renders N filled / empty stars as inline SVGs */
const StarRow = ({ rating, size = 16, className = "" }) => {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <span className={`star-row ${className}`} aria-label={`${rating} de 5 estrellas`}>
      {stars.map((n) => {
        const filled = n <= rating;
        const half   = !filled && n - 0.5 <= rating;
        return (
          <svg
            key={n}
            className={`star-row__star ${filled ? "star-row__star--filled" : half ? "star-row__star--half" : "star-row__star--empty"}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${n}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={`url(#half-${n})`}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            )}
          </svg>
        );
      })}
    </span>
  );
};

/** Interactive star picker used in the form */
const StarPicker = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      className="reviews__star-picker"
      role="group"
      aria-label="Seleccioná tu puntuación"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`reviews__star-btn ${n <= active ? "reviews__star-btn--active" : ""}`}
          aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={n <= active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
};

/** Skeleton block — single review card placeholder */
const ReviewSkeleton = () => (
  <div className="reviews__skeleton" aria-hidden="true">
    <div className="reviews__skeleton-line reviews__skeleton-line--short" />
    <div className="reviews__skeleton-line reviews__skeleton-line--stars" />
    <div className="reviews__skeleton-line" />
    <div className="reviews__skeleton-line reviews__skeleton-line--long" />
  </div>
);

/** Distribution bar for one star level */
const DistributionBar = ({ label, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="reviews__dist-row" aria-label={`${label} estrellas: ${count} reseñas`}>
      <span className="reviews__dist-label">{label}★</span>
      <div className="reviews__dist-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="reviews__dist-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="reviews__dist-count">{count}</span>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const ProductReviews = ({ productId }) => {
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAll,  setShowAll]  = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitState, setSubmitState] = useState("idle"); // idle | loading | success | error

  // Form fields
  const [name,    setName]    = useState("");
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [errors,  setErrors]  = useState({});

  const formRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews(data ?? []);
      } else {
        // offline/demo: nothing to fetch — local state starts empty
        setReviews([]);
      }
    } catch (err) {
      console.error("[ProductReviews] fetch error:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId, fetchReviews]);

  // ── Derived state ──────────────────────────────────────────────────────

  const summary  = computeSummary(reviews);
  const visible  = showAll ? reviews : reviews.slice(0, PAGE_SIZE);
  const hasMore  = reviews.length > PAGE_SIZE && !showAll;

  // ── Form validation ────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!name.trim())              e.name    = "Ingresá tu nombre.";
    if (rating === 0)              e.rating  = "Seleccioná una puntuación.";
    if (comment.trim().length < 20)
      e.comment = `El comentario debe tener al menos 20 caracteres (${comment.trim().length}/20).`;
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    setSubmitState("loading");

    const newReview = {
      product_id:        productId,
      author_name:       name.trim(),
      rating,
      comment:           comment.trim(),
      verified_purchase: false,
      created_at:        new Date().toISOString(),
    };

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("reviews")
          .insert([newReview])
          .select()
          .single();

        if (error) throw error;
        setReviews((prev) => [data, ...prev]);
      } else {
        // Offline mode: local insert
        setReviews((prev) => [{ ...newReview, id: `local-${Date.now()}` }, ...prev]);
      }

      setSubmitState("success");
      setName("");
      setRating(0);
      setComment("");

      // Collapse form after a moment
      setTimeout(() => {
        setFormOpen(false);
        setSubmitState("idle");
      }, 2400);
    } catch (err) {
      console.error("[ProductReviews] submit error:", err);
      setSubmitState("error");
    }
  };

  const handleOpenForm = () => {
    setFormOpen(true);
    setSubmitState("idle");
    setErrors({});
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <section className="reviews" aria-labelledby="reviews-heading">

      {/* ── Section heading ─────────────────────────────────── */}
      <div className="reviews__header">
        <h2 className="reviews__heading" id="reviews-heading">
          <em>Reseñas</em>
        </h2>
        {!formOpen && (
          <button
            className="reviews__cta"
            onClick={handleOpenForm}
            type="button"
          >
            Dejar reseña
          </button>
        )}
      </div>

      {/* ── Summary ─────────────────────────────────────────── */}
      {!loading && (
        <div className="reviews__summary">
          {reviews.length > 0 ? (
            <>
              {/* Left: big average score */}
              <div className="reviews__average">
                <span className="reviews__average-num">{summary.average}</span>
                <StarRow rating={parseFloat(summary.average)} size={20} className="reviews__average-stars" />
                <span className="reviews__average-total">
                  {summary.total} {summary.total === 1 ? "reseña" : "reseñas"}
                </span>
              </div>

              {/* Right: distribution bars (5★ first) */}
              <div className="reviews__distribution">
                {[5, 4, 3, 2, 1].map((n) => (
                  <DistributionBar
                    key={n}
                    label={n}
                    count={summary.distribution[n - 1]}
                    total={summary.total}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="reviews__empty">
              Todavía no hay reseñas para este producto.{" "}
              <button className="reviews__empty-link" type="button" onClick={handleOpenForm}>
                Sé el primero en opinar.
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────── */}
      {loading && (
        <div className="reviews__skeleton-list" aria-label="Cargando reseñas…">
          {Array.from({ length: 3 }).map((_, i) => <ReviewSkeleton key={i} />)}
        </div>
      )}

      {/* ── Review list ─────────────────────────────────────── */}
      {!loading && reviews.length > 0 && (
        <ul className="reviews__list" aria-label="Lista de reseñas">
          {visible.map((review) => (
            <li key={review.id} className="reviews__item">
              <div className="reviews__item-header">
                <div className="reviews__item-meta">
                  <span className="reviews__item-author">{review.author_name}</span>
                  {review.verified_purchase && (
                    <span className="reviews__badge" aria-label="Compra verificada">
                      ✓ Compra verificada
                    </span>
                  )}
                </div>
                <time
                  className="reviews__item-date"
                  dateTime={review.created_at}
                >
                  {formatDate(review.created_at)}
                </time>
              </div>

              <StarRow rating={review.rating} size={14} className="reviews__item-stars" />

              <p className="reviews__item-comment">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {/* ── Ver todas button ─────────────────────────────────── */}
      {hasMore && (
        <button
          className="reviews__load-more"
          type="button"
          onClick={() => setShowAll(true)}
        >
          Ver todas las reseñas ({reviews.length})
        </button>
      )}

      {/* ── Form ─────────────────────────────────────────────── */}
      {formOpen && (
        <div className="reviews__form-wrap" ref={formRef}>
          <div className="reviews__form-inner">
            <h3 className="reviews__form-title">Tu opinión</h3>

            {submitState === "success" ? (
              <div className="reviews__success" role="status">
                <span className="reviews__success-icon" aria-hidden="true">✓</span>
                <p className="reviews__success-msg">¡Gracias por tu reseña!</p>
              </div>
            ) : (
              <form className="reviews__form" onSubmit={handleSubmit} noValidate>

                {/* Name */}
                <div className="reviews__field">
                  <label className="reviews__label" htmlFor="review-name">Nombre</label>
                  <input
                    id="review-name"
                    className={`reviews__input ${errors.name ? "reviews__input--error" : ""}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    maxLength={80}
                  />
                  {errors.name && <span className="reviews__error" role="alert">{errors.name}</span>}
                </div>

                {/* Star picker */}
                <div className="reviews__field">
                  <label className="reviews__label">Puntuación</label>
                  <StarPicker value={rating} onChange={setRating} />
                  {errors.rating && <span className="reviews__error" role="alert">{errors.rating}</span>}
                </div>

                {/* Comment */}
                <div className="reviews__field">
                  <label className="reviews__label" htmlFor="review-comment">
                    Comentario
                    <span className="reviews__char-count" aria-live="polite">
                      {comment.trim().length}/20 mínimo
                    </span>
                  </label>
                  <textarea
                    id="review-comment"
                    className={`reviews__textarea ${errors.comment ? "reviews__input--error" : ""}`}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Contá tu experiencia con el producto…"
                    rows={4}
                    maxLength={800}
                  />
                  {errors.comment && (
                    <span className="reviews__error" role="alert">{errors.comment}</span>
                  )}
                </div>

                {submitState === "error" && (
                  <p className="reviews__error reviews__error--submit" role="alert">
                    Hubo un error al enviar. Intentá de nuevo.
                  </p>
                )}

                <div className="reviews__form-actions">
                  <button
                    type="submit"
                    className="reviews__submit"
                    disabled={submitState === "loading"}
                  >
                    {submitState === "loading" ? "Enviando…" : "Publicar reseña"}
                  </button>
                  <button
                    type="button"
                    className="reviews__cancel"
                    onClick={() => { setFormOpen(false); setErrors({}); setSubmitState("idle"); }}
                  >
                    Cancelar
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </section>
  );
};

export default ProductReviews;
