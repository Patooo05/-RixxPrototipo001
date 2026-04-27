import { useState, useEffect, useCallback } from "react";
import { isSupabaseEnabled } from "../../lib/supabase";
import { sbFetch } from "../../lib/supabaseHelpers";

function generateCouponCode(type, value) {
  const prefixes = ["RIXX", "LENTES", "STYLE", "PROMO", "VIP"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  if (value) {
    return type === "percentage" ? `${prefix}${value}OFF` : `${prefix}${value}`;
  }
  const rand = Math.floor(Math.random() * 90 + 10);
  return `${prefix}${rand}`;
}

export default function CuponesTab() {
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "", type: "percentage", value: "", valid_until: "", min_purchase: "", max_uses: "",
  });
  const [couponFormMsg, setCouponFormMsg] = useState(null);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponCodeCopied, setCouponCodeCopied] = useState(false);
  const [couponPreviewRef, setCouponPreviewRef] = useState(2000);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchCoupons = useCallback(async () => {
    if (!isSupabaseEnabled) return;
    setCouponsLoading(true);
    try {
      const data = await sbFetch("coupons?select=*&order=created_at.desc");
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      setCouponFormMsg({ type: "error", text: "Error al cargar cupones. Recargá la página." });
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleGenerateCouponCode = () => {
    const generated = generateCouponCode(couponForm.type, couponForm.value);
    setCouponForm((prev) => ({ ...prev, code: generated.toUpperCase() }));
  };

  const handleCopyCouponCode = () => {
    if (!couponForm.code) return;
    navigator.clipboard.writeText(couponForm.code).then(() => {
      setCouponCodeCopied(true);
      setTimeout(() => setCouponCodeCopied(false), 1500);
    });
  };

  const handleCouponFormChange = (e) => {
    const { name, value } = e.target;
    setCouponForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setCouponFormMsg(null);
    if (!couponForm.code.trim()) {
      setCouponFormMsg({ type: "error", text: "El código es obligatorio." });
      return;
    }
    if (!couponForm.value || isNaN(Number(couponForm.value)) || Number(couponForm.value) <= 0) {
      setCouponFormMsg({ type: "error", text: "El valor debe ser un número positivo." });
      return;
    }
    setCouponSaving(true);
    try {
      const payload = {
        code: couponForm.code.trim(),
        type: couponForm.type,
        value: Number(couponForm.value),
        active: true,
        valid_until: couponForm.valid_until || null,
        min_purchase: couponForm.min_purchase ? Number(couponForm.min_purchase) : null,
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
        used_count: 0,
      };
      await sbFetch("coupons", { method: "POST", body: JSON.stringify(payload) });
      setCouponForm({ code: "", type: "percentage", value: "", valid_until: "", min_purchase: "", max_uses: "" });
      setCouponFormMsg({ type: "ok", text: "Cupón creado correctamente." });
      await fetchCoupons();
    } catch (err) {
      const msg = err?.message?.includes("duplicate") || err?.message?.includes("23505")
        ? "Ya existe un cupón con ese código."
        : "Error al crear el cupón.";
      setCouponFormMsg({ type: "error", text: msg });
    } finally {
      setCouponSaving(false);
    }
  };

  const handleCouponToggle = async (id, currentActive) => {
    try {
      await sbFetch(`coupons?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !currentActive }),
      });
      setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, active: !currentActive } : c));
    } catch {
      setCouponFormMsg({ type: "error", text: "Error al actualizar el cupón." });
    }
  };

  const handleCouponDelete = (id, code) => {
    setDeleteConfirm({ id, code });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, code } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await sbFetch(`coupons?id=eq.${id}`, { method: "DELETE" });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setCouponFormMsg({ type: "error", text: `Error al eliminar el cupón ${code}.` });
    }
  };

  return (
    <div className="cupones-tab">

      <div className="cupones-form-card">
        <p className="cupones-section-title">Nuevo cupón</p>
        <form className="cupones-form" onSubmit={handleCouponSubmit}>
          <div className="cupones-form-row">
            <div className="cupones-field">
              <label className="cupones-label">Código *</label>
              <div className="cupones-code-input-wrap">
                <input
                  className="cupones-input"
                  name="code"
                  value={couponForm.code}
                  onChange={handleCouponFormChange}
                  placeholder="SUMMER20"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="cupones-code-btn"
                  onClick={handleGenerateCouponCode}
                  title="Generar código"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5z"/>
                    <path d="M19 14l1 2.5L22.5 17 20 18l-1 2.5-1-2.5L15.5 17l2.5-1z"/>
                    <path d="M5 17l0.8 1.8L7.5 19.5 5.8 20.3 5 22l-0.8-1.8L2.5 19.5l1.7-0.7z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className={`cupones-code-btn${couponCodeCopied ? " cupones-code-btn--copied" : ""}`}
                  onClick={handleCopyCouponCode}
                  title="Copiar código"
                  disabled={!couponForm.code}
                >
                  {couponCodeCopied ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="cupones-field">
              <label className="cupones-label">Tipo *</label>
              <select
                className="cupones-select"
                name="type"
                value={couponForm.type}
                onChange={handleCouponFormChange}
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>
            <div className="cupones-field">
              <label className="cupones-label">Valor *</label>
              <input
                className="cupones-input"
                type="number"
                name="value"
                value={couponForm.value}
                onChange={handleCouponFormChange}
                placeholder={couponForm.type === "percentage" ? "20" : "500"}
                min="0"
                step="any"
              />
            </div>
          </div>
          <div className="cupones-form-row">
            <div className="cupones-field">
              <label className="cupones-label">Vence el (opcional)</label>
              <input
                className="cupones-input"
                type="date"
                name="valid_until"
                value={couponForm.valid_until}
                onChange={handleCouponFormChange}
              />
            </div>
            <div className="cupones-field">
              <label className="cupones-label">Compra mínima (opcional)</label>
              <input
                className="cupones-input"
                type="number"
                name="min_purchase"
                value={couponForm.min_purchase}
                onChange={handleCouponFormChange}
                placeholder="1000"
                min="0"
              />
            </div>
            <div className="cupones-field">
              <label className="cupones-label">Usos máximos (opcional)</label>
              <input
                className="cupones-input"
                type="number"
                name="max_uses"
                value={couponForm.max_uses}
                onChange={handleCouponFormChange}
                placeholder="100"
                min="1"
              />
            </div>
          </div>
          {couponForm.type && couponForm.value && Number(couponForm.value) > 0 && (
            <div className="cupones-preview">
              <div className="cupones-preview-label">Vista previa del descuento</div>
              <div className="cupones-preview-row">
                <div className="cupones-preview-item">
                  <span className="cupones-preview-item__label">Código</span>
                  <span className="cupones-preview-item__value cupones-preview-item__value--code">
                    {couponForm.code || "—"}
                  </span>
                </div>
                <div className="cupones-preview-item">
                  <span className="cupones-preview-item__label">Compra de referencia</span>
                  <div className="cupones-preview-ref-wrap">
                    <span className="cupones-preview-ref-sign">$</span>
                    <input
                      className="cupones-preview-ref-input"
                      type="number"
                      value={couponPreviewRef}
                      min="0"
                      onChange={(e) => setCouponPreviewRef(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="cupones-preview-item">
                  <span className="cupones-preview-item__label">Descuento</span>
                  <span className="cupones-preview-item__value cupones-preview-item__value--discount">
                    {couponForm.type === "percentage"
                      ? `- $${(couponPreviewRef * (Number(couponForm.value) / 100)).toFixed(0)}`
                      : `- $${Number(couponForm.value)}`}
                  </span>
                </div>
                <div className="cupones-preview-item">
                  <span className="cupones-preview-item__label">Total</span>
                  <span className="cupones-preview-item__value cupones-preview-item__value--total">
                    {`$${Math.max(0, couponForm.type === "percentage"
                      ? couponPreviewRef - couponPreviewRef * (Number(couponForm.value) / 100)
                      : couponPreviewRef - Number(couponForm.value)).toFixed(0)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="cupones-form-actions">
            <button className="cupones-submit-btn" type="submit" disabled={couponSaving}>
              {couponSaving ? "Guardando..." : "Crear cupón"}
            </button>
            {couponFormMsg && (
              <span className={`cupones-form-msg cupones-form-msg--${couponFormMsg.type}`}>
                {couponFormMsg.text}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="cupones-list-card">
        <div className="cupones-list-header">
          <span className="cupones-list-title">Cupones existentes</span>
          <span className="cupones-count">{coupons.length} cupón{coupons.length !== 1 ? "es" : ""}</span>
        </div>

        {!isSupabaseEnabled ? (
          <div className="cupones-loading">Supabase no configurado</div>
        ) : couponsLoading ? (
          <div className="cupones-loading">Cargando...</div>
        ) : coupons.length === 0 ? (
          <div className="cupones-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="6" width="22" height="12" rx="2"/>
              <path d="M1 10h22M1 14h22"/>
            </svg>
            <p>No hay cupones creados</p>
          </div>
        ) : (
          <>
            <div className="cupones-table-head">
              <span className="cupones-th">Código</span>
              <span className="cupones-th">Estado</span>
              <span className="cupones-th">Descuento</span>
              <span className="cupones-th">Vencimiento</span>
              <span className="cupones-th">Compra min.</span>
              <span className="cupones-th">Usos</span>
              <span className="cupones-th cupones-th--right">Acciones</span>
            </div>
            <div className="cupones-rows">
              {coupons.map((c) => {
                const now = new Date();
                const isExpired = c.valid_until && new Date(c.valid_until) < now;
                const daysLeft = c.valid_until
                  ? Math.ceil((new Date(c.valid_until) - now) / (1000 * 60 * 60 * 24))
                  : null;
                const venceText = (() => {
                  if (!c.valid_until) return null;
                  if (isExpired) return "Vencido";
                  if (daysLeft <= 30) return `Vence en ${daysLeft}d`;
                  return new Date(c.valid_until).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
                })();
                const discountLabel = c.type === "percentage"
                  ? `${c.value}% OFF`
                  : `- $${c.value}`;
                const usedCount = c.used_count ?? 0;
                const usagePct = c.max_uses ? (usedCount / c.max_uses) * 100 : null;
                const usageColor = usagePct === null ? null
                  : usagePct > 90 ? "#e05252"
                  : usagePct > 70 ? "#D4AF37"
                  : "#6fcf7a";
                return (
                  <div key={c.id} className="cupones-row">
                    <div className="cupones-col">
                      <span className="cupones-code">{c.code}</span>
                      {c.type && (
                        <span className="cupones-code-sub">
                          {c.type === "percentage" ? "Porcentaje" : "Monto fijo"}
                        </span>
                      )}
                    </div>
                    <div className="cupones-col">
                      <span className={`cupones-badge cupones-badge--${c.active ? "active" : "inactive"}`}>
                        {c.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="cupones-col">
                      <span className="cupones-value">
                        {c.type === "percentage" ? `${c.value}%` : `$${c.value}`}
                      </span>
                      <span className="cupones-type-tag">{discountLabel}</span>
                    </div>
                    <div className="cupones-col cupones-col--min">
                      {venceText ? (
                        <span className={`cupones-meta${isExpired ? " cupones-meta--expired" : daysLeft !== null && daysLeft <= 7 ? " cupones-meta--warn" : ""}`}>
                          {venceText}
                        </span>
                      ) : (
                        <span className="cupones-meta cupones-meta--muted">Sin límite</span>
                      )}
                    </div>
                    <div className="cupones-col cupones-col--min">
                      {c.min_purchase ? (
                        <span className="cupones-meta">${c.min_purchase}</span>
                      ) : (
                        <span className="cupones-meta cupones-meta--muted">—</span>
                      )}
                    </div>
                    <div className="cupones-col cupones-col--max">
                      <span className="cupones-uses">
                        {c.max_uses ? `${usedCount} / ${c.max_uses}` : `${usedCount} usos`}
                      </span>
                      {c.max_uses && (
                        <div className="cupones-usage-bar" title={`${usedCount} / ${c.max_uses} usos`}>
                          <div
                            className="cupones-usage-fill"
                            style={{ width: `${Math.min(usagePct, 100)}%`, background: usageColor }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="cupones-col cupones-col--actions">
                      <button
                        className={`cupones-btn cupones-btn--toggle-${c.active ? "on" : "off"}`}
                        onClick={() => handleCouponToggle(c.id, c.active)}
                        title={c.active ? "Desactivar" : "Activar"}
                      >
                        {c.active ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 8h1a4 4 0 010 8h-1"/>
                            <path d="M2 12h16"/>
                            <rect x="2" y="8" width="10" height="8" rx="4"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 8h1a4 4 0 010 8h-1"/>
                            <path d="M2 12h16"/>
                            <rect x="2" y="8" width="10" height="8" rx="4"/>
                          </svg>
                        )}
                      </button>
                      <button
                        className="cupones-btn cupones-btn--delete"
                        onClick={() => handleCouponDelete(c.id, c.code)}
                        title="Eliminar"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__icon">⚠</div>
            <h3 className="confirm-modal__title">Eliminar cupón</h3>
            <p>¿Eliminar el cupón <strong>"{deleteConfirm.code}"</strong>?</p>
            <p className="confirm-modal__sub">Esta acción no se puede deshacer.</p>
            <div className="confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
