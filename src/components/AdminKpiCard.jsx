/**
 * AdminKpiCard — shared KPI card used by Stock and Ventas tabs.
 *
 * Props:
 *  label   {string}  — uppercase label below the value
 *  value   {string|number} — main figure
 *  alert   {boolean} — amber border/value (warning state, e.g. pending orders)
 *  danger  {boolean} — red border/value (critical state, e.g. out-of-stock)
 *  accent  {boolean} — gold border highlight (positive accent)
 */
const AdminKpiCard = ({ label, value, alert, danger, accent }) => {
  const mod = danger ? " admin-kpi--danger"
            : alert  ? " admin-kpi--alert"
            : accent ? " admin-kpi--accent"
            : "";
  return (
    <div className={`admin-kpi${mod}`}>
      <span className="admin-kpi__value">{value}</span>
      <span className="admin-kpi__label">{label}</span>
    </div>
  );
};

export default AdminKpiCard;
