import { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "./AuthContext.jsx";
import "../styles/AuthModals.scss";

const WELCOME_COUPON = "RIXX001";

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const RegisterModal = ({ show, onClose, onSwitchToLogin }) => {
  const { register } = useContext(AuthContext);

  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState("");
  const [success,     setSuccess]     = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Field-level validation errors — activate on blur, clear on change
  const [touched,    setTouched]    = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const modalRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const first = modalRef.current?.querySelector('input, button');
    first?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  // ── Validators ──────────────────────────────────────────────
  const validateEmail = (val) => {
    if (!emailRegex.test(val)) return "Email inválido";
    return "";
  };

  const validatePassword = (val) =>
    val.length < 8 ? "Mínimo 8 caracteres" : "";

  const validateConfirm = (val, pwd = password) =>
    val !== pwd ? "Las contraseñas no coinciden" : "";

  const hasErrors = () =>
    !name ||
    !email ||
    !password ||
    !confirm ||
    !!validateEmail(email) ||
    !!validatePassword(password) ||
    !!validateConfirm(confirm);

  // ── Blur handlers ────────────────────────────────────────────
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err = "";
    if (field === "email")    err = validateEmail(email);
    if (field === "password") err = validatePassword(password);
    if (field === "confirm")  err = validateConfirm(confirm);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  // ── Change handlers ──────────────────────────────────────────
  const handleEmailChange = (val) => {
    setEmail(val);
    if (touched.email)
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (touched.password)
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(val) }));
    // re-validate confirm if already touched
    if (touched.confirm)
      setFieldErrors((prev) => ({ ...prev, confirm: validateConfirm(confirm, val) }));
  };

  const handleConfirmChange = (val) => {
    setConfirm(val);
    if (touched.confirm)
      setFieldErrors((prev) => ({ ...prev, confirm: validateConfirm(val) }));
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (hasErrors()) {
      // Touch all fields so errors become visible
      setTouched({ email: true, password: true, confirm: true });
      setFieldErrors({
        email:    validateEmail(email),
        password: validatePassword(password),
        confirm:  validateConfirm(confirm),
      });
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    const result = await register(name, email, password);
    setLoading(false);

    if (result?.ok) {
      setSuccess(true);
    } else {
      setApiError(result?.error ?? "No se pudo crear la cuenta. Intentá de nuevo.");
    }
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(WELCOME_COUPON).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleClose = () => {
    if (success) {
      window.dispatchEvent(new CustomEvent("rixx:coupon-chip", { detail: { code: WELCOME_COUPON } }));
    }
    resetForm();
    setSuccess(false);
    setCopied(false);
    onClose();
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
    setTouched({}); setFieldErrors({}); setApiError("");
  };

  const handleSwitch = () => {
    resetForm();
    onClose();
    if (onSwitchToLogin) onSwitchToLogin();
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Crear cuenta">

        <button className="auth-modal__close" onClick={handleClose} aria-label="Cerrar">
          <IconClose />
        </button>

        {/* ── Pantalla de bienvenida con cupón ── */}
        {success ? (
          <div className="auth-modal__welcome">
            <div className="auth-modal__welcome-icon">◆</div>
            <h2 className="auth-modal__title">Bienvenido/a, <em>{name}</em></h2>
            <p className="auth-modal__subtitle">Tu cuenta fue creada. Como regalo de bienvenida, tenés este cupón para tu primera compra:</p>
            <div className="auth-modal__coupon-box">
              <span className="auth-modal__coupon-code">{WELCOME_COUPON}</span>
              <button className="auth-modal__coupon-copy" onClick={handleCopyCoupon}>
                {copied ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
            <p className="auth-modal__coupon-hint">Ingresalo en el checkout al hacer tu primera compra.</p>
            <button className="auth-modal__submit" onClick={handleClose}>
              Ir a comprar
            </button>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="auth-modal__header">
          <span className="auth-modal__eyebrow">Opcional</span>
          <h2 className="auth-modal__title">Creá <em>tu cuenta</em></h2>
          <p className="auth-modal__subtitle">No es necesario para comprar — es para hacerlo mejor.</p>
        </div>

        {/* Benefits */}
        <ul className="auth-modal__benefits" aria-label="Beneficios de crear cuenta">
          <li><span className="auth-modal__benefit-check">✓</span> Seguí tus pedidos en tiempo real</li>
          <li><span className="auth-modal__benefit-check">✓</span> Guardá tus favoritos</li>
          <li><span className="auth-modal__benefit-check">✓</span> Completá el checkout sin formularios</li>
          <li><span className="auth-modal__benefit-check">✓</span> Cupón de bienvenida al registrarte</li>
        </ul>

        <form className="auth-modal__form" onSubmit={handleSubmit} noValidate>

          <div className="auth-modal__field">
            <label htmlFor="reg-name" className="auth-modal__label">Nombre</label>
            <input
              id="reg-name"
              className="auth-modal__input"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="auth-modal__field">
            <label htmlFor="reg-email" className="auth-modal__label">Email</label>
            <input
              id="reg-email"
              className={`auth-modal__input${touched.email && fieldErrors.email ? " auth-modal__input--error" : ""}`}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur("email")}
              autoComplete="email"
            />
            {touched.email && fieldErrors.email && (
              <span className="auth-modal__error-msg">{fieldErrors.email}</span>
            )}
          </div>

          <div className="auth-modal__field">
            <label htmlFor="reg-password" className="auth-modal__label">Contraseña</label>
            <div className="auth-modal__input-wrap">
              <input
                id="reg-password"
                className={`auth-modal__input${touched.password && fieldErrors.password ? " auth-modal__input--error" : ""}`}
                type={showPwd ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur("password")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-modal__pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <EyeIcon open={showPwd} />
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <span className="auth-modal__error-msg">{fieldErrors.password}</span>
            )}
          </div>

          <div className="auth-modal__field">
            <label htmlFor="reg-confirm" className="auth-modal__label">Confirmar contraseña</label>
            <div className="auth-modal__input-wrap">
              <input
                id="reg-confirm"
                className={`auth-modal__input${touched.confirm && fieldErrors.confirm ? " auth-modal__input--error" : ""}`}
                type={showConfirm ? "text" : "password"}
                placeholder="Repetí la contraseña"
                value={confirm}
                onChange={(e) => handleConfirmChange(e.target.value)}
                onBlur={() => handleBlur("confirm")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-modal__pwd-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {touched.confirm && fieldErrors.confirm && (
              <span className="auth-modal__error-msg">{fieldErrors.confirm}</span>
            )}
          </div>

          {apiError && <p className="auth-modal__api-error">{apiError}</p>}

          <button
            type="submit"
            className="auth-modal__submit"
            disabled={loading}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-modal__switch">
          ¿Ya tenés cuenta?
          <button type="button" onClick={handleSwitch}>Iniciá sesión</button>
        </div>
          </>
        )}

      </div>
    </div>
  );
};

export default RegisterModal;
