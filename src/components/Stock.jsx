import { useState, useContext, useMemo } from "react";
import { ProductsContext } from "./ProductsContext";
import { useToast } from "./ToastContext";
import "../styles/Stock.scss";

// ── Helpers ───────────────────────────────────────────────────────────────────
const stockStatus = (stock) => {
  if (stock === 0) return "out";
  if (stock <= 5)  return "low";
  return "ok";
};

const stockBadge = (stock) => {
  const s = stockStatus(stock);
  if (s === "out") return { label: "Agotado",  cls: "badge--out"  };
  if (s === "low") return { label: "Stock bajo", cls: "badge--low" };
  return             { label: "OK",          cls: "badge--ok"   };
};

const fmtDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleString("es-UY", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
};


// ── Component ─────────────────────────────────────────────────────────────────
const Stock = ({ onEditProduct }) => {
  const { products, updateProduct } = useContext(ProductsContext);
  const { toast } = useToast();

  // ── Local activity log ────────────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState([]);

  const logEntry = (type, product, qty, oldStock, newStock) => {
    setActivityLog((prev) => [{
      id: Date.now(),
      type,
      productId:   product.id,
      productName: product.name,
      productImg:  product.image || null,
      quantity:    qty,
      oldStock,
      newStock,
      date: new Date().toISOString(),
    }, ...prev]);
  };

  // ── Table filters ─────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Stepper local state ───────────────────────────────────────────────────
  const [pendingStock, setPendingStock] = useState({});  // { [id]: value }

  // ── History filters ───────────────────────────────────────────────────────
  const [historyType,  setHistoryType]  = useState("all");
  const [historyLimit, setHistoryLimit] = useState(20);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeProducts = products.filter((p) => !p.status || p.status === "activo");
  const kpi = useMemo(() => ({
    total:      activeProducts.length,
    units:      activeProducts.reduce((s, p) => s + (p.stock || 0), 0),
    outOfStock: activeProducts.filter((p) => p.stock === 0).length,
  }), [activeProducts]);

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return activeProducts
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => {
        if (statusFilter === "out") return p.stock === 0;
        if (statusFilter === "low") return p.stock > 0 && p.stock <= 5;
        if (statusFilter === "ok")  return p.stock > 5;
        return true;
      });
  }, [activeProducts, search, statusFilter]);

  // ── Filtered history ──────────────────────────────────────────────────────
  const filteredLog = useMemo(() => {
    return activityLog
      .filter((e) => historyType === "all" || e.type === historyType)
      .slice(0, historyLimit);
  }, [activityLog, historyType, historyLimit]);

  // ── Stock stepper actions ─────────────────────────────────────────────────
  const getPending = (product) =>
    pendingStock[product.id] !== undefined ? pendingStock[product.id] : product.stock;

  const adjustPending = (product, delta) => {
    const current = getPending(product);
    const next = Math.max(0, current + delta);
    setPendingStock((prev) => ({ ...prev, [product.id]: next }));
  };

  const saveStock = async (product) => {
    const newStock = getPending(product);
    if (newStock === product.stock) return;
    const oldStock = product.stock;
    await updateProduct({ ...product, stock: newStock });
    logEntry("edit", product, Math.abs(newStock - oldStock), oldStock, newStock);
    setPendingStock((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
    toast.success(`Stock de ${product.name} actualizado a ${newStock} unidades`);
  };

  return (
    <div className="stk">

      {/* ── KPI CARDS ────────────────────────────────────────── */}
      <div className="stk__kpis">
        <div className="stk__kpi">
          <span className="stk__kpi-value">{kpi.total}</span>
          <span className="stk__kpi-label">Productos activos</span>
        </div>
        <div className="stk__kpi">
          <span className="stk__kpi-value">{kpi.units}</span>
          <span className="stk__kpi-label">Unidades en stock</span>
        </div>
        <div className={`stk__kpi ${kpi.outOfStock > 0 ? "stk__kpi--alert" : ""}`}>
          <span className="stk__kpi-value">{kpi.outOfStock}</span>
          <span className="stk__kpi-label">Agotados</span>
        </div>
      </div>

      {/* ── TABLA DE PRODUCTOS ───────────────────────────────── */}
      <section className="stk__section">
        <header className="stk__section-header">
          <h3 className="stk__section-title">Inventario</h3>

          {/* Filtro estado */}
          <div className="stk__status-filters">
            {[
              { value: "all", label: "Todos"    },
              { value: "out", label: "Agotado"  },
              { value: "low", label: "Stock bajo"},
              { value: "ok",  label: "OK"        },
            ].map((f) => (
              <button
                key={f.value}
                className={`stk__status-btn${statusFilter === f.value ? " stk__status-btn--active" : ""}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="stk__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="stk__search-input"
            />
            {search && (
              <button className="stk__search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>
        </header>

        <div className="stk__table-wrap">
          <table className="stk__table">
            <thead>
              <tr>
                <th></th>
                <th>Modelo</th>
                <th>Estado</th>
                <th>Stock</th>
                <th>Ajustar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="stk__empty-row">
                    No hay productos con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const { label, cls } = stockBadge(product.stock);
                  const pending = getPending(product);
                  const isDirty = pending !== product.stock;
                  return (
                    <tr key={product.id} className={`stk__row stk__row--${stockStatus(product.stock)}`}>
                      {/* Thumbnail */}
                      <td className="stk__col-thumb">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="stk__thumb" />
                          : <div className="stk__thumb stk__thumb--placeholder" />
                        }
                      </td>

                      {/* Nombre */}
                      <td className="stk__col-name">{product.name}</td>

                      {/* Badge estado */}
                      <td className="stk__col-status">
                        <span className={`stk__badge ${cls}`}>{label}</span>
                      </td>

                      {/* Stock actual */}
                      <td className="stk__col-stock">
                        <span className="stk__stock-num">{product.stock}</span>
                      </td>

                      {/* Stepper */}
                      <td className="stk__col-stepper">
                        <div className="stk__stepper">
                          <button
                            className="stk__step-btn"
                            onClick={() => adjustPending(product, -1)}
                            disabled={pending <= 0}
                            aria-label="Reducir stock"
                          >−</button>
                          <input
                            className="stk__step-input"
                            type="number"
                            min="0"
                            value={pending}
                            onChange={(e) =>
                              setPendingStock((prev) => ({
                                ...prev,
                                [product.id]: Math.max(0, Number(e.target.value)),
                              }))
                            }
                          />
                          <button
                            className="stk__step-btn"
                            onClick={() => adjustPending(product, 1)}
                            aria-label="Aumentar stock"
                          >+</button>
                          {isDirty && (
                            <button
                              className="stk__save-btn"
                              onClick={() => saveStock(product)}
                              aria-label="Guardar cambio"
                            >
                              Guardar
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Ir a editar */}
                      <td className="stk__col-action">
                        {onEditProduct && (
                          <button
                            className="stk__edit-btn"
                            onClick={() => onEditProduct(product)}
                            aria-label={`Editar ${product.name}`}
                            title="Editar producto"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── HISTORIAL ────────────────────────────────────────── */}
      <section className="stk__section">
        <header className="stk__section-header">
          <h3 className="stk__section-title">Historial de movimientos</h3>

          <div className="stk__history-filters">
            {[
              { value: "all",  label: "Todos"   },
              { value: "edit", label: "Ajustes" },
            ].map((f) => (
              <button
                key={f.value}
                className={`stk__status-btn${historyType === f.value ? " stk__status-btn--active" : ""}`}
                onClick={() => setHistoryType(f.value)}
              >
                {f.label}
              </button>
            ))}

            {activityLog.length > 0 && (
              <span className="stk__history-total">
                {activityLog.length} movimiento{activityLog.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </header>

        {filteredLog.length === 0 ? (
          <div className="stk__history-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p>Aún no hay ajustes registrados.</p>
            <span>Cuando modifiques el stock de un producto, aparecerá aquí.</span>
          </div>
        ) : (
          <>
            <div className="stk__table-wrap">
              <table className="stk__table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.map((entry) => (
                    <tr key={entry.id} className={`stk__row stk__log--${entry.type}`}>
                      <td className="stk__col-thumb">
                        {entry.productImg
                          ? <img src={entry.productImg} alt={entry.productName} className="stk__thumb" />
                          : <div className="stk__thumb stk__thumb--placeholder" />
                        }
                      </td>
                      <td className="stk__col-name">{entry.productName}</td>
                      <td>
                        <span className={`stk__log-type stk__log-type--${entry.type}`}>
                          {entry.type === "sale" ? "Venta" : "Ajuste"}
                        </span>
                      </td>
                      <td>
                        <span className={entry.type === "sale" ? "stk__qty--minus" : "stk__qty--plus"}>
                          {entry.type === "sale" ? `−${entry.quantity}` : `${entry.newStock > entry.oldStock ? "+" : ""}${entry.newStock - entry.oldStock}`}
                        </span>
                      </td>
                      <td className="stk__log-stock">
                        <span className="stk__log-old">{entry.oldStock}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                        <span className="stk__log-new">{entry.newStock}</span>
                      </td>
                      <td className="stk__log-date">{fmtDate(entry.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activityLog.filter((e) => historyType === "all" || e.type === historyType).length > historyLimit && (
              <button
                className="stk__load-more"
                onClick={() => setHistoryLimit((l) => l + 20)}
              >
                Ver más movimientos
              </button>
            )}
          </>
        )}
      </section>

    </div>
  );
};

export default Stock;
