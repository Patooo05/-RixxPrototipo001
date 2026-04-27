import { useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useOrders } from "./OrdersContext.jsx";
import "../styles/MyOrders.scss";


const STATUS_CONFIG = {
  pendiente:  { label: "Pendiente",   cls: "pending"   },
  confirmado: { label: "Confirmado",  cls: "confirmed" },
  armando:    { label: "Preparando",  cls: "preparing" },
  enviado:    { label: "Enviado",     cls: "shipped"   },
  entregado:  { label: "Entregado",   cls: "delivered" },
  cancelado:  { label: "Cancelado",   cls: "cancelled" },
  reclamo:    { label: "Reclamo",     cls: "claim"     },
};

const PROGRESS_STEPS = ["confirmado", "armando", "enviado", "entregado"];
const PROGRESS_LABELS = {
  confirmado: "Confirmado",
  armando:    "Preparando",
  enviado:    "Enviado",
  entregado:  "Entregado",
};

const PAYMENT_LABELS = {
  transferencia:  "Transferencia",
  "mercado-pago": "Mercado Pago",
  "mercadopago":  "Mercado Pago",
  efectivo:       "Efectivo",
  tarjeta:        "Tarjeta",
  contraentrega:  "Contra entrega",
  "whatsapp":     "WhatsApp",
};

function fmtPrice(n) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n ?? 0);
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
}

function fmtPayment(method) {
  if (!method) return null;
  return PAYMENT_LABELS[method.toLowerCase()] ?? method;
}

function shortId(id) {
  return String(id ?? "").slice(0, 8).toUpperCase();
}

const IconChevron = ({ open }) => (
  <svg
    className={`order-card__chevron${open ? " order-card__chevron--open" : ""}`}
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconTracking = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

function ProgressBar({ status }) {
  if (["reclamo", "cancelado"].includes(status)) return null;
  const isPending = status === "pendiente";
  const effectiveStatus = isPending ? "confirmado" : status;
  const currentIdx = PROGRESS_STEPS.indexOf(effectiveStatus);

  return (
    <div className="order-card__progress" aria-label="Estado del pedido">
      {PROGRESS_STEPS.map((step, i) => {
        const isDone    = isPending ? false : i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div
            key={step}
            className={[
              "order-card__step",
              isDone    ? "order-card__step--done"    : "",
              isCurrent ? "order-card__step--current" : "",
            ].join(" ").trim()}
          >
            {i < PROGRESS_STEPS.length - 1 && (
              <div
                className={[
                  "order-card__step-line",
                  isDone && i < currentIdx ? "order-card__step-line--done" : "",
                ].join(" ").trim()}
              />
            )}
            <div className="order-card__step-dot" />
            <span className="order-card__step-label">{PROGRESS_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const status  = STATUS_CONFIG[order.status] ?? { label: order.status, cls: "pending" };
  const items   = Array.isArray(order.items) ? order.items : [];
  const payment = fmtPayment(order.payment_method);
  const orderId = String(order.id ?? "");
  const trackId = orderId.slice(0, 8);

  const handleTracking = useCallback(
    (e) => { e.stopPropagation(); navigate(`/pedido/${trackId}`); },
    [navigate, trackId]
  );

  const shippingLine = [
    order.shipping_address?.direccion,
    order.shipping_address?.departamento,
  ].filter(Boolean).join(", ");

  return (
    <article className={`order-card${open ? " order-card--open" : ""}`}>
      <button
        className="order-card__top"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Pedido #${shortId(order.id)}`}
      >
        <div className="order-card__meta">
          <span className="order-card__id">#{shortId(order.id)}</span>
          <span className="order-card__date">{fmtDate(order.created_at)}</span>
        </div>

        <div className="order-card__header-right">
          <span className={`order-card__status order-card__status--${status.cls}`}>
            {status.label}
          </span>
          {payment && (
            <span className="order-card__payment">{payment}</span>
          )}
          <span className="order-card__total-preview">{fmtPrice(order.total)}</span>
          <IconChevron open={open} />
        </div>
      </button>

      <div className={`order-card__body${open ? " order-card__body--visible" : ""}`}>
        <div className="order-card__body-inner">
          <ProgressBar status={order.status} />

          {items.length > 0 && (
            <div className="order-card__items">
              {items.map((item, i) => (
                <div key={i} className="order-card__item">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-card__item-img"
                      loading="lazy"
                    />
                  )}
                  <span className="order-card__item-name">{item.name}</span>
                  <span className="order-card__item-qty">×{item.qty ?? 1}</span>
                  <span className="order-card__item-price">{fmtPrice(item.price)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="order-card__footer">
            <div className="order-card__footer-left">
              {shippingLine && (
                <span className="order-card__shipping">
                  <span className="order-card__footer-label">Envío</span>
                  {shippingLine}
                </span>
              )}
              {order.coupon_code && (
                <span className="order-card__coupon">
                  <span className="order-card__footer-label">Cupón</span>
                  {order.coupon_code}
                </span>
              )}
              {order.shipping != null && order.shipping > 0 && (
                <span className="order-card__shipping-cost">
                  <span className="order-card__footer-label">Costo envío</span>
                  {fmtPrice(order.shipping)}
                </span>
              )}
            </div>

            <div className="order-card__footer-right">
              <span className="order-card__total">{fmtPrice(order.total)}</span>
              <button
                className="order-card__track-btn"
                onClick={handleTracking}
                aria-label={`Ver tracking del pedido ${shortId(order.id)}`}
              >
                <IconTracking />
                Ver tracking
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const ACTIVE_STATUSES = new Set(["confirmado", "armando", "enviado"]);
const FILTER_OPTIONS = ["Todos", "Activos", "Entregados"];

function OrdersKpis({ orders }) {
  const total = orders.length;
  const spent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const lastDate = orders.length > 0 ? fmtDate(orders[0].created_at) : "—";

  return (
    <div className="orders-kpis">
      <div className="orders-kpi">
        <span className="orders-kpi__label">Pedidos</span>
        <span className="orders-kpi__value">{total}</span>
      </div>
      <div className="orders-kpi">
        <span className="orders-kpi__label">Total gastado</span>
        <span className="orders-kpi__value">{fmtPrice(spent)}</span>
      </div>
      <div className="orders-kpi">
        <span className="orders-kpi__label">Último pedido</span>
        <span className="orders-kpi__value" style={{ fontSize: "0.8rem" }}>{lastDate}</span>
      </div>
    </div>
  );
}

function PedidosSection({ orders, loading, currentUser }) {
  const [filter, setFilter] = useState("Todos");

  const myOrders = useMemo(
    () =>
      orders
        .filter((o) => o.user_email === currentUser?.email)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders, currentUser?.email]
  );

  const visibleOrders = useMemo(() => {
    if (filter === "Activos")    return myOrders.filter((o) => ACTIVE_STATUSES.has(o.status));
    if (filter === "Entregados") return myOrders.filter((o) => o.status === "entregado");
    return myOrders;
  }, [myOrders, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <h2 style={{ fontFamily: "var(--font-headline, serif)", color: "#D4AF37", margin: 0 }}>
          Mis Pedidos
        </h2>
        <Link
          to="/mis-pedidos"
          style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#D4AF37", textDecoration: "none", opacity: 0.75, transition: "opacity 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.75"}
        >
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="my-orders__list">
          {[0, 1, 2].map((i) => <div key={i} className="order-skeleton" />)}
        </div>
      ) : myOrders.length === 0 ? (
        <div className="orders-empty-filter">
          <span className="orders-empty-filter__icon">◆</span>
          <p className="orders-empty-filter__text">
            Todavía no realizaste ningún pedido.{" "}
            <Link to="/productos" style={{ color: "#D4AF37", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.7rem" }}>
              Ver productos
            </Link>
          </p>
        </div>
      ) : (
        <>
          <OrdersKpis orders={myOrders} />

          <div className="orders-filters">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`orders-filter-btn${filter === opt ? " orders-filter-btn--active" : ""}`}
                onClick={() => setFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          {visibleOrders.length === 0 ? (
            <div className="orders-empty-filter">
              <span className="orders-empty-filter__icon">◆</span>
              <p className="orders-empty-filter__text">
                {filter === "Activos" ? "No tenés pedidos activos en este momento." : "No tenés pedidos entregados todavía."}
              </p>
            </div>
          ) : (
            <div className="my-orders__list">
              {visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Edit Profile Form ────────────────────────────────────────────────────────

function EditProfileForm({ currentUser, updateUser, onCancel }) {
  const [name, setName]               = useState(currentUser?.name ?? "");
  const [email, setEmail]             = useState(currentUser?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [errors, setErrors]           = useState({});
  const [status, setStatus]           = useState(null); // "success" | "error"
  const [statusMsg, setStatusMsg]     = useState("");
  const [saving, setSaving]           = useState(false);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "El nombre no puede estar vacío";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Ingresá un email válido";
    if (newPassword) {
      if (newPassword.length < 4)
        errs.newPassword = "La contraseña debe tener al menos 4 caracteres";
      if (newPassword !== confirmPwd)
        errs.confirmPwd = "Las contraseñas no coinciden";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await updateUser({
      name: name.trim(),
      email: email.trim(),
      password: newPassword || undefined,
    });
    setSaving(false);
    if (result?.ok) {
      setStatus("success");
      setStatusMsg("Perfil actualizado correctamente.");
      setNewPassword("");
      setConfirmPwd("");
      setTimeout(() => { setStatus(null); onCancel(); }, 1800);
    } else {
      setStatus("error");
      setStatusMsg(result?.error ?? "No se pudo guardar. Intentá de nuevo.");
    }
  };

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
      <h3 className="profile-edit-form__title">Editar perfil</h3>

      {/* Nombre */}
      <div className="profile-edit-form__field">
        <label className="profile-edit-form__label" htmlFor="edit-name">Nombre</label>
        <input
          id="edit-name"
          className={`profile-edit-form__input${errors.name ? " profile-edit-form__input--error" : ""}`}
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
          autoComplete="name"
        />
        {errors.name && <span className="profile-edit-form__error">{errors.name}</span>}
      </div>

      {/* Email */}
      <div className="profile-edit-form__field">
        <label className="profile-edit-form__label" htmlFor="edit-email">Email</label>
        <input
          id="edit-email"
          className={`profile-edit-form__input${errors.email ? " profile-edit-form__input--error" : ""}`}
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
          autoComplete="email"
        />
        {errors.email && <span className="profile-edit-form__error">{errors.email}</span>}
      </div>

      {/* Nueva contraseña */}
      <div className="profile-edit-form__field">
        <label className="profile-edit-form__label" htmlFor="edit-password">
          Nueva contraseña
          <span className="profile-edit-form__label-hint"> (opcional)</span>
        </label>
        <input
          id="edit-password"
          className={`profile-edit-form__input${errors.newPassword ? " profile-edit-form__input--error" : ""}`}
          type="password"
          value={newPassword}
          onChange={e => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: undefined, confirmPwd: undefined })); }}
          placeholder="Dejá vacío para no cambiar"
          autoComplete="new-password"
        />
        {errors.newPassword && <span className="profile-edit-form__error">{errors.newPassword}</span>}
      </div>

      {/* Confirmar contraseña — aparece solo cuando se está escribiendo */}
      {newPassword.length > 0 && (
        <div className="profile-edit-form__field">
          <label className="profile-edit-form__label" htmlFor="edit-confirm-password">
            Confirmar contraseña
          </label>
          <input
            id="edit-confirm-password"
            className={`profile-edit-form__input${errors.confirmPwd ? " profile-edit-form__input--error" : ""}`}
            type="password"
            value={confirmPwd}
            onChange={e => { setConfirmPwd(e.target.value); setErrors(prev => ({ ...prev, confirmPwd: undefined })); }}
            placeholder="Repetí la nueva contraseña"
            autoComplete="new-password"
          />
          {errors.confirmPwd && <span className="profile-edit-form__error">{errors.confirmPwd}</span>}
        </div>
      )}

      {/* Feedback inline */}
      {status && (
        <div className={`profile-edit-form__feedback profile-edit-form__feedback--${status}`}>
          {statusMsg}
        </div>
      )}

      {/* Acciones */}
      <div className="profile-edit-form__actions">
        <button
          type="button"
          className="profile-edit-form__btn profile-edit-form__btn--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="profile-edit-form__btn profile-edit-form__btn--primary"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ─── ProfileSection ───────────────────────────────────────────────────────────

const ProfileSection = ({ section }) => {
  const { currentUser, logout, updateUser } = useContext(AuthContext);
  const { orders, loading, getUserOrders } = useOrders();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (currentUser?.email) {
      getUserOrders(currentUser.email);
    }
  }, [currentUser?.email, getUserOrders]);

  switch (section) {
    case "Información":
      return (
        <div style={{ maxWidth: 640 }}>

          {/* Header */}
          <div className="profile-section-header">
            <div className="profile-section-header__text">
              <h2 className="profile-section-header__title">Información personal</h2>
              <p className="profile-section-header__sub">Administrá los datos de tu cuenta</p>
            </div>
            {!editing && (
              <button
                className="profile-edit-trigger"
                onClick={() => setEditing(true)}
                aria-label="Editar perfil"
              >
                Editar perfil
              </button>
            )}
          </div>

          {editing ? (
            <EditProfileForm
              currentUser={currentUser}
              updateUser={updateUser}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="profile-info-grid">
                <div className="profile-info-card">
                  <span className="profile-info-card__label">Nombre</span>
                  <span className="profile-info-card__value">{currentUser?.name || "—"}</span>
                </div>
                <div className="profile-info-card">
                  <span className="profile-info-card__label">Email</span>
                  <span className="profile-info-card__value">{currentUser?.email || "—"}</span>
                </div>
                <div className="profile-info-card">
                  <span className="profile-info-card__label">Rol</span>
                  <span className="profile-info-card__value profile-info-card__value--accent">
                    {currentUser?.role === "admin" ? "Administrador" : "Cliente"}
                  </span>
                </div>
              </div>

              <div className="profile-actions">
                <button onClick={logout} className="profile-logout-btn">
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      );

    case "Pedidos": {
      return <PedidosSection orders={orders} loading={loading} currentUser={currentUser} />;
    }

    case "Ajustes":
      return (
        <div style={{ maxWidth: 640 }}>
          <div className="profile-section-header">
            <div className="profile-section-header__text">
              <h2 className="profile-section-header__title">Ajustes</h2>
              <p className="profile-section-header__sub">Preferencias y seguridad de tu cuenta</p>
            </div>
          </div>

          <div className="profile-settings__group">
            <p className="profile-settings__group-title">Seguridad</p>
            <div className="profile-settings__item">
              <div className="profile-settings__item-info">
                <span className="profile-settings__item-name">Contraseña</span>
                <span className="profile-settings__item-desc">
                  Actualizá tu contraseña para mantener tu cuenta protegida
                </span>
              </div>
              <button
                className="profile-settings__item-action"
                onClick={() => window.dispatchEvent(new CustomEvent("rixx:goto-profile-info"))}
              >
                Cambiar →
              </button>
            </div>
          </div>

          <div className="profile-settings__group">
            <p className="profile-settings__group-title">Cuenta</p>
            <div className="profile-settings__item">
              <div className="profile-settings__item-info">
                <span className="profile-settings__item-name">Notificaciones</span>
                <span className="profile-settings__item-desc">
                  Recibí novedades, drops y promociones por email
                </span>
              </div>
              <button className="profile-settings__item-action">Configurar →</button>
            </div>
            <div className="profile-settings__item">
              <div className="profile-settings__item-info">
                <span className="profile-settings__item-name">Historial de pedidos</span>
                <span className="profile-settings__item-desc">
                  Revisá todos tus pedidos anteriores y su estado
                </span>
              </div>
              <button
                className="profile-settings__item-action"
                onClick={() => window.dispatchEvent(new CustomEvent("rixx:goto-profile-pedidos"))}
              >
                Ver pedidos →
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return <div>Sección no encontrada</div>;
  }
};

export default ProfileSection;
