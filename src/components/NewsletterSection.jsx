import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import "../styles/NewsletterSection.scss";

// ─── helpers ────────────────────────────────────────────────────────────────

const roundToDecade = (n) => Math.floor(n / 10) * 10;

const formatCount = (n) => {
  if (n >= 1000) return `+${(n / 1000).toFixed(1)}k`;
  return `+${n}`;
};

// ─── component ──────────────────────────────────────────────────────────────

const NewsletterSection = () => {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [status,  setStatus]  = useState("idle"); // idle | loading | success | error | duplicate
  const [count,   setCount]   = useState(null);
  const successRef = useRef(null);

  // ── fetch subscriber count ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const fetchCount = async () => {
      try {
        const { count: total, error } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true });

        if (!error && typeof total === "number") {
          setCount(roundToDecade(total));
        }
      } catch {
        // silently fail — count is decorative
      }
    };

    fetchCount();
  }, []);

  // ── scroll success into view ─────────────────────────────────────────────
  useEffect(() => {
    if (status === "success" && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [status]);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    if (!isSupabaseEnabled) {
      // demo / offline mode — simulate success after brief delay
      await new Promise((r) => setTimeout(r, 900));
      setStatus("success");
      return;
    }

    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: email.trim().toLowerCase(), name: name.trim() || null, source: "website" }]);

      if (error) {
        // 23505 = unique_violation (email already exists)
        if (error.code === "23505") {
          setStatus("duplicate");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("success");
        setCount((prev) => (prev !== null ? prev + 10 : null)); // optimistic bump
      }
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    setEmail("");
    setName("");
    setStatus("idle");
  };

  // ── render ───────────────────────────────────────────────────────────────
  const isLoading   = status === "loading";
  const isSuccess   = status === "success";
  const isDuplicate = status === "duplicate";
  const isError     = status === "error";
  const showForm    = !isSuccess;

  return (
    <section className="newsletter" aria-labelledby="newsletter-heading">

      {/* ── decorative radial accent ── */}
      <div className="newsletter__glow" aria-hidden="true" />

      <div className="newsletter__inner">

        {/* ── editorial header ── */}
        <header className="newsletter__header">
          <span className="newsletter__eyebrow">Colección Exclusiva</span>

          <h2 className="newsletter__title" id="newsletter-heading">
            Sé el primero{" "}
            <span className="newsletter__title-break">
              en <em className="newsletter__title-italic">saber.</em>
            </span>
          </h2>

          <p className="newsletter__subtitle">
            Acceso anticipado a nuevas colecciones, descuentos exclusivos
            y novedades de Rixx.
          </p>

          {/* subscriber count badge */}
          {count !== null && count > 0 && (
            <p className="newsletter__count" aria-live="polite">
              <span className="newsletter__count-number">{formatCount(count)}</span>
              {" "}personas ya están dentro
            </p>
          )}
        </header>

        {/* ── success state ── */}
        {isSuccess && (
          <div
            className="newsletter__success"
            ref={successRef}
            role="status"
            aria-live="polite"
          >
            <span className="newsletter__success-icon" aria-hidden="true">✦</span>
            <p className="newsletter__success-title">Bienvenido a Rixx.</p>
            <p className="newsletter__success-text">
              Serás el primero en conocer cada lanzamiento exclusivo.
            </p>
            <button
              type="button"
              className="newsletter__reset"
              onClick={handleReset}
            >
              Suscribir otro correo
            </button>
          </div>
        )}

        {/* ── form ── */}
        {showForm && (
          <form
            className="newsletter__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* name (optional) */}
            <div className="newsletter__field">
              <label htmlFor="nl-name" className="newsletter__label">
                Nombre <span className="newsletter__optional">(opcional)</span>
              </label>
              <input
                id="nl-name"
                type="text"
                className="newsletter__input"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoComplete="given-name"
              />
            </div>

            {/* email (required) */}
            <div className="newsletter__field">
              <label htmlFor="nl-email" className="newsletter__label">
                Correo electrónico
              </label>
              <input
                id="nl-email"
                type="email"
                className={`newsletter__input${isDuplicate || isError ? " newsletter__input--error" : ""}`}
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (isDuplicate || isError) setStatus("idle"); }}
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>

            {/* inline feedback */}
            {(isDuplicate || isError) && (
              <p className="newsletter__feedback newsletter__feedback--error" role="alert">
                {isDuplicate
                  ? "Este correo ya está suscrito. ¡Gracias por tu entusiasmo!"
                  : "Algo falló. Por favor intentá de nuevo."}
              </p>
            )}

            {/* CTA */}
            <button
              type="submit"
              className="newsletter__btn"
              disabled={isLoading || !email.trim()}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="newsletter__btn-loading" aria-label="Cargando">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                "Suscribirme"
              )}
            </button>
          </form>
        )}

        {/* ── legal footnote ── */}
        <p className="newsletter__legal">
          Sin spam. Podés darte de baja cuando quieras.
        </p>

      </div>
    </section>
  );
};

export default NewsletterSection;
