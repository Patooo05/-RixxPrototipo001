import { useState, useEffect } from "react";
import "../styles/Contacto.scss";

const ASUNTOS = [
  { value: "", label: "Seleccioná un asunto" },
  { value: "consulta", label: "Consulta general" },
  { value: "pedido", label: "Pedido" },
  { value: "garantia", label: "Garantía" },
  { value: "otro", label: "Otro" },
];

const EMPTY_FORM = { nombre: "", email: "", asunto: "", mensaje: "" };

// ── Inline SVG icons (no external libs) ──────────────────────
const IconMail = () => (
  <svg
    className="contacto-page__info-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
);

const IconPhone = () => (
  <svg
    className="contacto-page__info-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.6 10.8a15.6 15.6 0 006.6 6.6l2.2-2.2a1 1 0 011.05-.24 11.4 11.4 0 003.55.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.55a1 1 0 01-.25 1.05L6.6 10.8z" />
  </svg>
);

const IconLocation = () => (
  <svg
    className="contacto-page__info-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export default function Contacto() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".fade-in-on-scroll").forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(true);
    setForm(EMPTY_FORM);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <main className="contacto-page">
      {/* ── Hero ── */}
      <section className="contacto-page__hero">
        <div className="contacto-page__hero-inner">
          <p className="contacto-page__eyebrow">Contacto</p>
          <h1 className="contacto-page__hero-title">
            <em>Estamos para ayudarte</em>
          </h1>
          <div className="contacto-page__hero-line" aria-hidden="true" />
        </div>
      </section>

      {/* ── Contenido ── */}
      <section className="contacto-page__body fade-in-on-scroll">
        <div className="contacto-page__body-inner">
          {/* Columna izquierda — formulario */}
          <div className="contacto-page__form-col">
            <form
              className="contacto-page__form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="contacto-page__field">
                <label className="contacto-page__label" htmlFor="nombre">
                  Nombre completo
                </label>
                <input
                  className="contacto-page__input"
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="contacto-page__field">
                <label className="contacto-page__label" htmlFor="email">
                  Email
                </label>
                <input
                  className="contacto-page__input"
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                />
              </div>

              <div className="contacto-page__field">
                <label className="contacto-page__label" htmlFor="asunto">
                  Asunto
                </label>
                <select
                  className="contacto-page__input contacto-page__input--select"
                  id="asunto"
                  name="asunto"
                  required
                  value={form.asunto}
                  onChange={handleChange}
                >
                  {ASUNTOS.map((a) => (
                    <option key={a.value} value={a.value} disabled={a.value === ""}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="contacto-page__field">
                <label className="contacto-page__label" htmlFor="mensaje">
                  Mensaje
                </label>
                <textarea
                  className="contacto-page__input contacto-page__input--textarea"
                  id="mensaje"
                  name="mensaje"
                  required
                  rows={5}
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder="¿En qué podemos ayudarte?"
                />
              </div>

              {success && (
                <p className="contacto-page__success" role="status">
                  ¡Mensaje enviado! Te contactamos pronto.
                </p>
              )}

              <button type="submit" className="primary-btn contacto-page__submit">
                Enviar mensaje
              </button>
            </form>
          </div>

          {/* Columna derecha — info */}
          <div className="contacto-page__info-col">
            <div className="contacto-page__info-block">
              <IconMail />
              <div>
                <p className="contacto-page__info-label">Email</p>
                <a
                  className="contacto-page__info-value"
                  href="mailto:contacto@rixx.uy"
                >
                  contacto@rixx.uy
                </a>
              </div>
            </div>

            <div className="contacto-page__info-block">
              <IconPhone />
              <div>
                <p className="contacto-page__info-label">WhatsApp</p>
                <a
                  className="contacto-page__info-value"
                  href="https://wa.me/59899000000"
                  target="_blank"
                  rel="noreferrer"
                >
                  +598 99 000 000
                </a>
              </div>
            </div>

            <div className="contacto-page__info-block">
              <IconLocation />
              <div>
                <p className="contacto-page__info-label">Ubicaciones</p>
                <p className="contacto-page__info-value">Florida, Uruguay</p>
                <p className="contacto-page__info-value">Montevideo, Uruguay</p>
              </div>
            </div>

            <div className="contacto-page__info-block contacto-page__info-block--horario">
              <div className="contacto-page__horario-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <p className="contacto-page__info-label">Horario</p>
                <p className="contacto-page__info-value">Lun–Vie 9:00–18:00</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
