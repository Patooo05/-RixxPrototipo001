export default function OperationsPanel({ data }) {
  if (!data) return null;

  const { lowStock = [], alerts = [] } = data;

  const urgencyLabel = (u) => (u === "critical" ? "CRÍTICO" : "BAJO");

  return (
    <div className="dash-panel dash-panel--operations">
      <h2 className="dash-panel__title">
        <span className="dash-panel__icon">◈</span>
        Operaciones
      </h2>

      {lowStock.length > 0 && (
        <div className="dash-section">
          <p className="dash-section__label">Alertas de stock</p>
          <ul className="dash-stock-list">
            {lowStock.map((item, i) => (
              <li key={i} className={`dash-stock-item dash-stock-item--${item.urgency}`}>
                <span className="dash-stock-item__badge">{urgencyLabel(item.urgency)}</span>
                <span className="dash-stock-item__name">{item.name}</span>
                <span className="dash-stock-item__qty">{item.stock} {item.stock === 1 ? "unidad" : "unidades"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="dash-section">
          <p className="dash-section__label">Alertas operativas</p>
          <ul className="dash-alerts">
            {alerts.map((alert, i) => (
              <li key={i} className="dash-alert">
                <span className="dash-alert__dot" />
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowStock.length === 0 && alerts.length === 0 && (
        <p className="dash-empty">Todo en orden. Sin alertas operativas.</p>
      )}
    </div>
  );
}
