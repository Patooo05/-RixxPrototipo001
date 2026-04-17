import "./BenefitsStrip.scss";

const BenefitsStrip = () => {
  const openRegister = () =>
    window.dispatchEvent(new CustomEvent("rixx:open-register"));

  return (
    <div className="benefits-strip" role="region" aria-label="Beneficios">
      <div className="benefits-strip__inner">

        {/* Garantía */}
        <div className="benefits-strip__item">
          <IconShield className="benefits-strip__icon" />
          <div className="benefits-strip__copy">
            <span className="benefits-strip__label">Garantía de 30 días</span>
            <span className="benefits-strip__sub">Sin preguntas, sin vueltas</span>
          </div>
        </div>

        <span className="benefits-strip__divider" aria-hidden="true" />

        {/* Envío */}
        <div className="benefits-strip__item">
          <IconPackage className="benefits-strip__icon" />
          <div className="benefits-strip__copy">
            <span className="benefits-strip__label">Envío gratis</span>
            <span className="benefits-strip__sub">Llevando 2 unidades · Todo Uruguay</span>
          </div>
        </div>

        <span className="benefits-strip__divider" aria-hidden="true" />

        {/* Registro CTA */}
        <button
          className="benefits-strip__item benefits-strip__item--cta"
          onClick={openRegister}
          aria-label="Registrate y obtené 20% off"
        >
          <IconTag className="benefits-strip__icon" />
          <div className="benefits-strip__copy">
            <span className="benefits-strip__label benefits-strip__label--gold">
              20% off al registrarte
            </span>
            <span className="benefits-strip__sub">Solo para nuevos clientes →</span>
          </div>
        </button>

      </div>
    </div>
  );
};

// ── Icons ──────────────────────────────────────────────────────
const IconShield = ({ className }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 3v6c0 5-3.5 9.74-8 11C7.5 20.74 4 16 4 11V5l8-3z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconPackage = ({ className }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconTag = ({ className }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export default BenefitsStrip;
