import { useContext, useState, useMemo, useRef } from "react";
import { ProductsContext } from "../components/ProductsContext.jsx";
import { runAISystem } from "../services/aiService.js";
import FinancePanel from "./FinancePanel.jsx";
import OperationsPanel from "./OperationsPanel.jsx";
import "./Dashboard.scss";

// Calcula el precio efectivo considerando descuentos activos
const effectivePrice = (p) => {
  if (p.descuento?.porcentaje && p.descuento?.hasta) {
    const until = new Date(p.descuento.hasta);
    if (until > new Date()) {
      return p.price * (1 - p.descuento.porcentaje / 100);
    }
  }
  return p.price;
};

// Fingerprint liviano de los productos para detectar cambios
const productsFingerprint = (products) =>
  products.reduce((acc, p) => acc + p.id + p.price + p.stock + (p.precioCosto || 0) + (p.status || ""), "");

export default function Dashboard() {
  const { products } = useContext(ProductsContext);

  const [insights, setInsights]           = useState(null);
  const [loading,  setLoading]            = useState(false);
  const [error,    setError]              = useState(null);
  const [lastRun,  setLastRun]            = useState(null);
  const [analysisFingerprint, setAnalysisFingerprint] = useState(null);
  const resultsRef = useRef(null);

  // Detecta si los datos cambiaron desde el último análisis
  const currentFingerprint = useMemo(() => productsFingerprint(products), [products]);
  const isDataStale = insights && analysisFingerprint !== null && currentFingerprint !== analysisFingerprint;

  // ── Business metrics derived from product catalog ─────────────
  const metrics = useMemo(() => {
    const activeProducts = products.filter((p) => !p.status || p.status === "activo");
    const revenue = activeProducts.reduce((sum, p) => sum + effectivePrice(p) * p.stock, 0);
    const costs   = activeProducts.reduce((sum, p) => sum + (p.precioCosto || 0) * p.stock, 0);
    const profit  = revenue - costs;
    const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";

    const byCategory = activeProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    return { revenue, costs, profit, margin, byCategory, activeProducts };
  }, [products]);

  // ── Run AI analysis ───────────────────────────────────────────
  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        products: products.map((p) => ({
          id:           p.id,
          name:         p.name,
          price:        p.price,
          precioEfectivo: effectivePrice(p),
          precioCosto:  p.precioCosto || 0,
          stock:        p.stock,
          category:     p.category,
          status:       p.status,
          featured:     p.featured,
          descuento:    p.descuento || null,
        })),
        revenue:  metrics.revenue,
        costs:    metrics.costs,
        adsSpend: 0,
      };

      const result = await runAISystem(payload);
      setInsights(result);
      setLastRun(new Date().toLocaleTimeString("es-UY"));
      setAnalysisFingerprint(currentFingerprint);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      console.error("[Dashboard] AI error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="ceo-dashboard">
      {/* Header */}
      <div className="ceo-dashboard__header">
        <div className="ceo-dashboard__header-left">
          <p className="ceo-dashboard__eyebrow">RIXX · CEO Dashboard</p>
          <h1 className="ceo-dashboard__title">AI Business Intelligence</h1>
          {lastRun && (
            <p className="ceo-dashboard__subtitle">Último análisis: {lastRun}</p>
          )}
          {isDataStale && (
            <p className="ceo-dashboard__stale-badge">
              ● Datos actualizados — re-ejecutá el análisis
            </p>
          )}
        </div>
        <button
          className={`ceo-dashboard__cta ${loading ? "ceo-dashboard__cta--loading" : ""}`}
          onClick={handleRunAnalysis}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="ceo-dashboard__spinner" />
              Analizando...
            </>
          ) : (
            <>
              <span>◆</span> Ejecutar análisis IA
            </>
          )}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="ceo-dashboard__strip">
        <div className="ceo-kpi">
          <span className="ceo-kpi__label">Valor del inventario</span>
          <span className="ceo-kpi__value">{fmt(metrics.revenue)}</span>
        </div>
        <div className="ceo-kpi">
          <span className="ceo-kpi__label">Costo del inventario</span>
          <span className="ceo-kpi__value ceo-kpi__value--muted">{fmt(metrics.costs)}</span>
        </div>
        <div className="ceo-kpi">
          <span className="ceo-kpi__label">Margen bruto</span>
          <span className={`ceo-kpi__value ${parseFloat(metrics.margin) >= 30 ? "ceo-kpi__value--green" : "ceo-kpi__value--yellow"}`}>
            {metrics.margin}%
          </span>
        </div>
        <div className="ceo-kpi">
          <span className="ceo-kpi__label">SKUs activos</span>
          <span className="ceo-kpi__value">{metrics.activeProducts.length}</span>
        </div>
        <div className="ceo-kpi">
          <span className="ceo-kpi__label">Agotados</span>
          <span className={`ceo-kpi__value ${products.filter((p) => p.stock === 0).length > 0 ? "ceo-kpi__value--red" : "ceo-kpi__value--green"}`}>
            {products.filter((p) => p.stock === 0).length}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="ceo-dashboard__error">
          <span className="ceo-dashboard__error-icon">⚠</span>
          <div>
            <strong>Error en el análisis</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!insights && !loading && !error && (
        <div className="ceo-dashboard__empty">
          <div className="ceo-dashboard__empty-icon">◆</div>
          <h2>Listo para analizar</h2>
          <p>
            Hacé click en <strong>Ejecutar análisis IA</strong> para obtener análisis de Finanzas,
            Operaciones y Crecimiento desarrollado con Claude.
          </p>
          <p className="ceo-dashboard__empty-note">
            El análisis se ejecuta localmente en base a los datos reales de tus productos.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="ceo-dashboard__loading">
          <div className="ceo-dashboard__loading-ring" />
          <p>Analizando los datos de tu negocio...</p>
          <p className="ceo-dashboard__loading-sub">Procesando inventario, márgenes y oportunidades de crecimiento...</p>
        </div>
      )}

      {/* Results */}
      {insights && !loading && (
        <div className="ceo-dashboard__results" ref={resultsRef}>
          {/* Finance + Operations */}
          <div className="ceo-dashboard__row">
            <FinancePanel
              data={insights.finance}
              revenue={metrics.revenue}
              costs={metrics.costs}
              profit={metrics.profit}
              margin={metrics.margin}
            />
            <OperationsPanel data={insights.operations} />
          </div>

          {/* Growth opportunities */}
          {insights.growth?.opportunities?.length > 0 && (
            <div className="dash-panel dash-panel--growth">
              <h2 className="dash-panel__title">
                <span className="dash-panel__icon">▲</span>
                Oportunidades de Crecimiento
              </h2>
              <ul className="dash-growth-list">
                {insights.growth.opportunities.map((opp, i) => (
                  <li key={i} className="dash-growth-item">
                    <span className="dash-growth-item__num">{String(i + 1).padStart(2, "0")}</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {insights.decisions?.length > 0 && (
            <div className="dash-panel dash-panel--decisions">
              <h2 className="dash-panel__title">
                <span className="dash-panel__icon">●</span>
                Decisiones clave
              </h2>
              <div className="dash-decisions">
                {insights.decisions.map((d, i) => (
                  <div key={i} className={`dash-decision dash-decision--${d.type}`}>
                    <span className="dash-decision__type">
                      {{ finance: "FINANZAS", operations: "OPERACIONES", growth: "CRECIMIENTO", risk: "RIESGO" }[d.type] ?? d.type.toUpperCase()}
                    </span>
                    <p className="dash-decision__msg">{d.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
