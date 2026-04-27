import { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import "../styles/Nosotros.scss";

const valores = [
  {
    titulo: "Diseño",
    descripcion: "Cada pieza refleja intención. Sin excesos, sin compromiso.",
  },
  {
    titulo: "Calidad",
    descripcion:
      "Materiales seleccionados. Procesos rigurosos. Resultado excepcional.",
  },
  {
    titulo: "Cercanía",
    descripcion: "Somos de acá. Entendemos el estilo uruguayo.",
  },
];

const ubicaciones = [
  {
    ciudad: "Florida",
    pais: "Uruguay",
    direccion: "18 de Julio 842, Florida",
    horario: "Lun–Vie 9:00–18:00 · Sáb 10:00–14:00",
    mapsUrl: "https://maps.google.com/?q=18+de+Julio+842+Florida+Uruguay",
  },
  {
    ciudad: "Montevideo",
    pais: "Uruguay",
    direccion: "Av. 18 de Julio 1234, Montevideo",
    horario: "Lun–Vie 9:00–19:00 · Sáb 10:00–15:00",
    mapsUrl: "https://maps.google.com/?q=Av+18+de+Julio+1234+Montevideo+Uruguay",
  },
];

export default function Nosotros() {
  usePageTitle("Nosotros");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".fade-in-on-scroll").forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="nosotros-page">
      {/* ── Hero ── */}
      <section className="nosotros-page__hero">
        <div className="nosotros-page__hero-inner">
          <p className="nosotros-page__eyebrow">Sobre RIXX</p>
          <h1 className="nosotros-page__hero-title">
            <em>Crafted in Uruguay</em>
          </h1>
          <div className="nosotros-page__hero-line" aria-hidden="true" />
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Historia ── */}
      <section className="nosotros-page__historia fade-in-on-scroll">
        <div className="nosotros-page__historia-inner">
          <div className="nosotros-page__historia-text">
            <h2 className="nosotros-page__section-title">Nuestra historia</h2>
            <p className="nosotros-page__historia-body">
              RIXX nació en Florida, Uruguay, con una visión clara — crear
              lentes que fusionen diseño europeo con identidad latinoamericana.
              Cada montura es elegida con obsesión por el detalle y
              craftsmanship. No seguimos tendencias: las definimos con
              discreción y carácter propio.
            </p>
          </div>
          <div className="nosotros-page__historia-visual" aria-hidden="true">
            <div className="nosotros-page__historia-quote">
              <span className="nosotros-page__historia-quote-mark">"</span>
              <p className="nosotros-page__historia-quote-text">
                No seguimos tendencias.<br />Las definimos.
              </p>
              <span className="nosotros-page__historia-quote-attr">— RIXX, Florida 2021</span>
            </div>
            <div className="nosotros-page__historia-stat-row">
              <div className="nosotros-page__historia-stat">
                <span className="nosotros-page__historia-stat-num">3</span>
                <span className="nosotros-page__historia-stat-label">Colecciones</span>
              </div>
              <div className="nosotros-page__historia-stat">
                <span className="nosotros-page__historia-stat-num">+500</span>
                <span className="nosotros-page__historia-stat-label">Clientes</span>
              </div>
              <div className="nosotros-page__historia-stat">
                <span className="nosotros-page__historia-stat-num">UY</span>
                <span className="nosotros-page__historia-stat-label">Origen</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Valores ── */}
      <section className="nosotros-page__valores fade-in-on-scroll">
        <div className="nosotros-page__valores-inner">
          <h2 className="nosotros-page__section-title nosotros-page__section-title--centered">
            Nuestros valores
          </h2>
          <div className="nosotros-page__valores-grid">
            {valores.map((v) => (
              <div key={v.titulo} className="nosotros-page__valor-card">
                <h3 className="nosotros-page__valor-titulo">{v.titulo}</h3>
                <p className="nosotros-page__valor-desc">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Ubicaciones ── */}
      <section className="nosotros-page__ubicaciones fade-in-on-scroll">
        <div className="nosotros-page__ubicaciones-inner">
          <h2 className="nosotros-page__section-title nosotros-page__section-title--centered">
            Dónde estamos
          </h2>
          <div className="nosotros-page__ubicaciones-grid">
            {ubicaciones.map((u) => (
              <div key={u.ciudad} className="nosotros-page__ubicacion-card">
                <p className="nosotros-page__ubicacion-pais">{u.pais}</p>
                <h3 className="nosotros-page__ubicacion-ciudad">{u.ciudad}</h3>
                <a
                  href={u.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nosotros-page__ubicacion-dir nosotros-page__ubicacion-dir--link"
                  aria-label={`Ver ${u.ciudad} en Google Maps`}
                >
                  {u.direccion}
                </a>
                <p className="nosotros-page__ubicacion-horario">{u.horario}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="nosotros-page__cta fade-in-on-scroll">
        <Link to="/productos" className="primary-btn">
          Explorá la colección
        </Link>
      </section>
    </main>
  );
}
