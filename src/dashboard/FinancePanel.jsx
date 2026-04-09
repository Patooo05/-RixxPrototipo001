export default function FinancePanel({ data, revenue, costs, profit, margin }) {
  const fmt = (n) =>
    new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="dash-panel dash-panel--finance">
      <h2 className="dash-panel__title">
        <span className="dash-panel__icon">◆</span>
        Finanzas
      </h2>

      <div className="dash-kpis">
        <div className="dash-kpi">
          <span className="dash-kpi__label">Valor inventario</span>
          <span className="dash-kpi__value dash-kpi__value--gold">{fmt(revenue)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi__label">Costo</span>
          <span className="dash-kpi__value dash-kpi__value--muted">{fmt(costs)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi__label">Ganancia bruta</span>
          <span className={`dash-kpi__value ${profit >= 0 ? "dash-kpi__value--green" : "dash-kpi__value--red"}`}>
            {fmt(profit)}
          </span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi__label">Margen</span>
          <span className={`dash-kpi__value ${parseFloat(margin) >= 30 ? "dash-kpi__value--green" : "dash-kpi__value--yellow"}`}>
            {margin}%
          </span>
        </div>
      </div>

      {data && (
        <div className="dash-insight">
          <p className="dash-insight__label">Análisis financiero</p>
          <p className="dash-insight__text">{data.recommendation}</p>
        </div>
      )}
    </div>
  );
}
