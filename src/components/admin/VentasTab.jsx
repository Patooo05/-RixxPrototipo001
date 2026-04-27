import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatOrderNumber } from "../OrdersContext";
import { fmtDateTime } from "../../lib/adminUtils";
import ShippingLabelModal from "../ShippingLabelModal";
import ShippingNotifyModal from "../ShippingNotifyModal";

function toWaNumber(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.startsWith("598") ? d : `598${d.replace(/^0/, "")}`;
}

const ORDERS_PER_PAGE = 15;
const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function VentasTab({
  orders,
  products,
  updateOrderStatus,
  updateOrderFields,
  createOrder,
  deleteOrder,
  syncEntregadosToSheets,
  updateProduct,
  toast,
}) {
  const [salesSearch, setSalesSearch]           = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("todas");
  const [salesDateFilter, setSalesDateFilter]   = useState("30d");
  const [expandedOrderId, setExpandedOrderId]   = useState(null);
  const [shippingLabelOrder, setShippingLabelOrder]   = useState(null);
  const [shippingNotifyOrder, setShippingNotifyOrder] = useState(null);
  const [salesPage, setSalesPage] = useState(1);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [notifyClient, setNotifyClient] = useState(false);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(null);

  const [quickSaleProd,     setQuickSaleProd]     = useState("");
  const [quickSaleQty,      setQuickSaleQty]      = useState(1);
  const [quickSaleError,    setQuickSaleError]    = useState("");
  const [quickSalesLog,     setQuickSalesLog]     = useState([]);
  const [quickSaleCustomer, setQuickSaleCustomer] = useState("");
  const [quickSaleEmail,    setQuickSaleEmail]    = useState("");
  const [quickSalePhone,    setQuickSalePhone]    = useState("");
  const [quickSaleMethod,      setQuickSaleMethod]      = useState("Efectivo");
  const [quickSaleShipping,    setQuickSaleShipping]    = useState(false);
  const [quickSaleShipCost,    setQuickSaleShipCost]    = useState("");
  const [quickSaleAddress,     setQuickSaleAddress]     = useState("");
  const [quickSaleDpto,        setQuickSaleDpto]        = useState("");
  const [quickSaleSuccess,     setQuickSaleSuccess]     = useState(false);

  const [qsComboOpen,   setQsComboOpen]   = useState(false);
  const [qsComboSearch, setQsComboSearch] = useState("");
  const qsComboRef = useRef(null);

  const selectedQuickProduct = products.find((p) => String(p.id) === String(quickSaleProd));

  const qsFilteredProducts = useMemo(() =>
    (products || [])
      .filter((p) => (!p.status || p.status === "activo") && p.stock > 0)
      .filter((p) => !qsComboSearch || p.name.toLowerCase().includes(qsComboSearch.toLowerCase()))
      .slice(0, 15),
    [products, qsComboSearch]
  );

  useEffect(() => {
    if (!qsComboOpen) return;
    const handler = (e) => { if (qsComboRef.current && !qsComboRef.current.contains(e.target)) setQsComboOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [qsComboOpen]);
  const quickSaleSubtotal = selectedQuickProduct ? (selectedQuickProduct.price || 0) * quickSaleQty : 0;
  const quickSaleShipAmt  = quickSaleShipping ? (parseFloat(quickSaleShipCost) || 0) : 0;
  const quickSaleTotal    = quickSaleSubtotal + quickSaleShipAmt;

  const handleQuickSale = async (e) => {
    if (e) e.preventDefault();
    setQuickSaleError("");
    if (!quickSaleProd) { setQuickSaleError("Seleccioná un producto."); return; }
    const product = selectedQuickProduct;
    if (!product) return;
    if (quickSaleQty <= 0) { setQuickSaleError("La cantidad debe ser mayor a 0."); return; }
    if (quickSaleQty > product.stock) {
      setQuickSaleError(`Stock insuficiente. Solo hay ${product.stock} unidades.`);
      return;
    }
    if (quickSaleShipping && !quickSaleAddress.trim()) {
      setQuickSaleError("La dirección de envío es requerida.");
      return;
    }
    const oldStock = product.stock;
    const newStock = product.stock - quickSaleQty;

    await updateProduct({ ...product, stock: newStock });

    const order = await createOrder({
      user_name:      quickSaleCustomer.trim() || "Venta directa",
      user_email:     quickSaleEmail.trim(),
      user_phone:     quickSalePhone.trim(),
      status:         quickSaleShipping ? "confirmado" : "entregado",
      payment_method: quickSaleMethod,
      items: [{
        name:     product.name,
        price:    product.price || 0,
        qty:      quickSaleQty,
        quantity: quickSaleQty,
        image:    product.image || null,
      }],
      subtotal:         quickSaleSubtotal,
      total:            quickSaleTotal,
      discount:         0,
      shipping:         quickSaleShipAmt,
      shipping_address: quickSaleShipping ? {
        direccion:    quickSaleAddress.trim(),
        departamento: quickSaleDpto.trim(),
      } : null,
      source: "admin",
    });

    setQuickSalesLog((prev) => [{
      id:          order?.id || Date.now(),
      orderId:     order?.id || null,
      productId:   product.id,
      productName: product.name,
      productImg:  product.image || null,
      customer:    quickSaleCustomer.trim() || "Venta directa",
      email:       quickSaleEmail.trim(),
      phone:       quickSalePhone.trim(),
      method:      quickSaleMethod,
      quantity:    quickSaleQty,
      subtotal:    quickSaleSubtotal,
      shipping:    quickSaleShipAmt,
      total:       quickSaleTotal,
      withShipping: quickSaleShipping,
      oldStock,
      newStock,
      date: new Date().toISOString(),
    }, ...prev]);

    setQuickSaleSuccess(true);
    toast.success(`Venta registrada — ${quickSaleQty} × ${product.name}${quickSaleShipping ? " · Con envío" : ""}`);
    setTimeout(() => {
      setQuickSaleSuccess(false);
      setQuickSaleProd("");
      setQuickSaleQty(1);
      setQuickSaleCustomer("");
      setQuickSaleEmail("");
      setQuickSalePhone("");
      setQuickSaleMethod("Efectivo");
      setQuickSaleShipping(false);
      setQuickSaleShipCost("");
      setQuickSaleAddress("");
      setQuickSaleDpto("");
    }, 1800);
  };

  const salesDateCutoff = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (salesDateFilter === "hoy") return now - 86400000;
    if (salesDateFilter === "7d")  return now - 7  * 86400000;
    if (salesDateFilter === "30d") return now - 30 * 86400000;
    return 0;
  }, [salesDateFilter]);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const matchSearch = !salesSearch ||
        (o.user_name  || "").toLowerCase().includes(salesSearch.toLowerCase()) ||
        (o.user_email || "").toLowerCase().includes(salesSearch.toLowerCase());
      const matchStatus = salesStatusFilter === "todas" || o.status === salesStatusFilter;
      const matchDate = !o.created_at || new Date(o.created_at).getTime() >= salesDateCutoff;
      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, salesSearch, salesStatusFilter, salesDateCutoff]);

  const pagedOrders = filteredOrders.slice((salesPage - 1) * ORDERS_PER_PAGE, salesPage * ORDERS_PER_PAGE);
  const totalPages  = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const salesKPIs = useMemo(() => {
    const totalRevenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders  = (orders || []).length;
    const avgTicket    = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pending      = (orders || []).filter(o => o.status === "pendiente").length;
    return { totalRevenue, totalOrders, avgTicket, pending };
  }, [orders]);

  const salesChartData = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      if (!o.created_at) return;
      const day = o.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + (o.total || 0);
    });
    const days = [];
    for (let i = 29; i >= 0; i--) {
      // eslint-disable-next-line react-hooks/purity
      const d   = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), total: map[key] || 0 });
    }
    return days;
  }, [orders]);

  const salesByMonth = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[d.getMonth()], total: 0 });
    }
    (orders || []).forEach(o => {
      if (!o.created_at) return;
      const key = o.created_at.slice(0, 7);
      const entry = months.find(m => m.key === key);
      if (entry) entry.total += (o.total || 0);
    });
    return months;
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    const statuses = [
      { name: "confirmado", color: "#6ab8ff" },
      { name: "armando",    color: "#e8a020" },
      { name: "enviado",    color: "#D4AF37" },
      { name: "entregado",  color: "#4caf82" },
      { name: "cancelado",  color: "#e05050" },
    ];
    const counts = {};
    (orders || []).forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return statuses
      .map(s => ({ ...s, value: counts[s.name] || 0 }))
      .filter(s => s.value > 0);
  }, [orders]);

  const chartKPIs = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const all = orders || [];
    const delivered = all.filter(o => o.status === "entregado");
    const totalCollected = delivered.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder = all.length > 0 ? all.reduce((s, o) => s + (o.total || 0), 0) / all.length : 0;
    const thisMonth = all.filter(o => o.created_at && o.created_at.startsWith(thisMonthKey)).length;
    const deliveryRate = all.length > 0 ? Math.round((delivered.length / all.length) * 100) : 0;
    return { totalCollected, avgOrder, thisMonth, deliveryRate };
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      (o.items || []).forEach(item => {
        const k = item.name || item.product_id || "—";
        if (!map[k]) map[k] = { name: k, qty: 0, revenue: 0, image: item.image };
        map[k].qty     += (item.qty || item.quantity || 1);
        map[k].revenue += (item.price || 0) * (item.qty || item.quantity || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  const exportSalesToExcel = () => {
    if (!orders || orders.length === 0) return;
    const wb = XLSX.utils.book_new();
    const ordersData = filteredOrders.map(o => ({
      ID: formatOrderNumber(o),
      Fecha: o.created_at ? new Date(o.created_at).toLocaleDateString("es-UY") : "—",
      Cliente: o.user_name  || "—",
      Email:   o.user_email || "—",
      Teléfono: o.user_phone || "—",
      Productos: (o.items || []).map(i => `${i.name} x${i.qty || i.quantity || 1}`).join(", "),
      Subtotal:  o.subtotal || o.total || 0,
      Envío:     o.shipping  || 0,
      Descuento: o.discount  || 0,
      Total:     o.total     || 0,
      "Método pago": o.payment_method || "—",
      Estado: o.status || "—",
    }));
    const ws1 = XLSX.utils.json_to_sheet(ordersData);
    ws1["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 50 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Órdenes");
    const ws2 = XLSX.utils.json_to_sheet(topProducts.map(p => ({ Producto: p.name, Unidades: p.qty, Revenue: p.revenue })));
    XLSX.utils.book_append_sheet(wb, ws2, "Más vendidos");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `rixx_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="ventas-tab">

      <div className="ventas-kpis">
        <div className="ventas-kpi">
          <span className="ventas-kpi__label">Total vendido</span>
          <span className="ventas-kpi__value">${Math.round(salesKPIs.totalRevenue).toLocaleString("es-UY")}</span>
        </div>
        <div className="ventas-kpi">
          <span className="ventas-kpi__label">Órdenes</span>
          <span className="ventas-kpi__value">{salesKPIs.totalOrders}</span>
        </div>
        <div className="ventas-kpi">
          <span className="ventas-kpi__label">Ticket promedio</span>
          <span className="ventas-kpi__value">${Math.round(salesKPIs.avgTicket).toLocaleString("es-UY")}</span>
        </div>
        <div className={`ventas-kpi${salesKPIs.pending > 0 ? " ventas-kpi--alert" : ""}`}>
          <span className="ventas-kpi__label">Pendientes</span>
          <span className="ventas-kpi__value">{salesKPIs.pending}</span>
        </div>
      </div>

      <div className="ventas-charts">

        <div className="ventas-charts__card">
          <h3 className="ventas-section-title">Ventas por mes (UYU)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByMonth} barCategoryGap="35%">
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(229,226,225,0.4)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(229,226,225,0.35)" }} tickLine={false} axisLine={false} width={55} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip
                cursor={{ fill: "rgba(212,175,55,0.06)" }}
                contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 4, fontSize: 11 }}
                labelStyle={{ color: "#99907c", fontSize: 10, letterSpacing: "0.1em" }}
                formatter={v => [`$${Math.round(v).toLocaleString("es-UY")}`, "Total"]}
              />
              <Bar dataKey="total" fill="#D4AF37" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ventas-charts__card">
          <h3 className="ventas-section-title">Órdenes por estado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ordersByStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={72}
                innerRadius={38}
                paddingAngle={2}
              >
                {ordersByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 4, fontSize: 11 }}
                formatter={(v, name) => [v, name]}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(229,226,225,0.45)", paddingTop: 6 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="ventas-charts__kpis">
          <h3 className="ventas-section-title">Métricas rápidas</h3>
          <div className="ventas-charts__kpi-grid">
            <div className="ventas-charts__kpi">
              <span className="ventas-charts__kpi-label">Total recaudado</span>
              <span className="ventas-charts__kpi-value">${Math.round(chartKPIs.totalCollected).toLocaleString("es-UY")}</span>
              <span className="ventas-charts__kpi-sub">solo entregados</span>
            </div>
            <div className="ventas-charts__kpi">
              <span className="ventas-charts__kpi-label">Orden promedio</span>
              <span className="ventas-charts__kpi-value">${Math.round(chartKPIs.avgOrder).toLocaleString("es-UY")}</span>
              <span className="ventas-charts__kpi-sub">todas las órdenes</span>
            </div>
            <div className="ventas-charts__kpi">
              <span className="ventas-charts__kpi-label">Este mes</span>
              <span className="ventas-charts__kpi-value">{chartKPIs.thisMonth}</span>
              <span className="ventas-charts__kpi-sub">órdenes nuevas</span>
            </div>
            <div className="ventas-charts__kpi">
              <span className="ventas-charts__kpi-label">Tasa de entrega</span>
              <span className="ventas-charts__kpi-value">{chartKPIs.deliveryRate}%</span>
              <span className="ventas-charts__kpi-sub">% entregadas</span>
            </div>
          </div>
        </div>

      </div>

      <div className="ventas-chart-card">
        <h3 className="ventas-section-title">Ventas últimos 30 días (UYU)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={salesChartData}>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} width={50} tickFormatter={v => v >= 1000 ? "$" + (v/1000).toFixed(0) + "k" : "$" + v} />
            <Tooltip formatter={v => [`$${v.toLocaleString("es-UY")}`, "Total"]} contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(212,175,55,0.2)", fontSize: 11 }} />
            <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={`ventas-quick-sale-card${quickSaleSuccess ? " ventas-quick-sale-card--success" : ""}`}>
        <h3 className="ventas-section-title">Registrar venta</h3>

        {quickSaleSuccess ? (
          <div className="vqs__success">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Venta registrada correctamente</span>
          </div>
        ) : (
          <form className="vqs" onSubmit={handleQuickSale}>

            <div className="vqs__row">
              <div className="vqs__thumb-wrap">
                {selectedQuickProduct?.image
                  ? <img src={selectedQuickProduct.image} alt={selectedQuickProduct.name} className="vqs__thumb" />
                  : <div className="vqs__thumb vqs__thumb--empty">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                }
              </div>

              <div className="vqs__select-wrap">
                <label className="vqs__label">Producto</label>
                <div className="qs-combobox" ref={qsComboRef}>
                  <div
                    className={`qs-combobox__trigger${qsComboOpen ? " qs-combobox__trigger--open" : ""}`}
                    onClick={() => setQsComboOpen((o) => !o)}
                    role="combobox"
                    aria-expanded={qsComboOpen}
                    aria-haspopup="listbox"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setQsComboOpen((o) => !o); } }}
                  >
                    {selectedQuickProduct ? (
                      <>
                        <span className="qs-combobox__selected-name">{selectedQuickProduct.name}</span>
                        <span className="qs-combobox__selected-meta">Stock: {selectedQuickProduct.stock} · ${(selectedQuickProduct.price || 0).toLocaleString("es-UY")}</span>
                      </>
                    ) : (
                      <span className="qs-combobox__placeholder">Buscar producto...</span>
                    )}
                    <svg className="qs-combobox__arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  {qsComboOpen && (
                    <div className="qs-combobox__dropdown" role="listbox">
                      <input
                        className="qs-combobox__search"
                        type="text"
                        placeholder="Filtrar productos..."
                        value={qsComboSearch}
                        onChange={(e) => setQsComboSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <ul className="qs-combobox__list">
                        {qsFilteredProducts.length === 0 ? (
                          <li className="qs-combobox__empty">Sin resultados</li>
                        ) : (
                          qsFilteredProducts.map((p) => (
                            <li
                              key={p.id}
                              className={`qs-combobox__option${String(quickSaleProd) === String(p.id) ? " qs-combobox__option--selected" : ""}`}
                              role="option"
                              aria-selected={String(quickSaleProd) === String(p.id)}
                              onClick={() => { setQuickSaleProd(String(p.id)); setQuickSaleError(""); setQsComboOpen(false); setQsComboSearch(""); }}
                            >
                              <span className="qs-combobox__option-name">{p.name}</span>
                              <span className="qs-combobox__option-meta">Stock: {p.stock} · ${(p.price || 0).toLocaleString("es-UY")}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="vqs__row vqs__row--fields">

              <div className="vqs__field vqs__field--qty">
                <label className="vqs__label">Cantidad</label>
                <div className="vqs__stepper">
                  <button
                    type="button"
                    className="vqs__step-btn"
                    onClick={() => { setQuickSaleQty(q => Math.max(1, q - 1)); setQuickSaleError(""); }}
                    disabled={quickSaleQty <= 1}
                    aria-label="Reducir"
                  >−</button>
                  <span className="vqs__step-val">{quickSaleQty}</span>
                  <button
                    type="button"
                    className="vqs__step-btn"
                    onClick={() => { setQuickSaleQty(q => Math.min(selectedQuickProduct?.stock || 999, q + 1)); setQuickSaleError(""); }}
                    disabled={selectedQuickProduct && quickSaleQty >= selectedQuickProduct.stock}
                    aria-label="Aumentar"
                  >+</button>
                </div>
              </div>

              <div className="vqs__field">
                <label className="vqs__label">Nombre (opcional)</label>
                <input
                  className="vqs__input"
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={quickSaleCustomer}
                  onChange={(e) => setQuickSaleCustomer(e.target.value)}
                />
              </div>
            </div>

            <div className="vqs__row vqs__row--fields">
              <div className="vqs__field">
                <label className="vqs__label">Correo (opcional)</label>
                <input
                  className="vqs__input"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={quickSaleEmail}
                  onChange={(e) => setQuickSaleEmail(e.target.value)}
                />
              </div>
              <div className="vqs__field">
                <label className="vqs__label">Teléfono (opcional)</label>
                <input
                  className="vqs__input"
                  type="tel"
                  placeholder="09X XXX XXX"
                  value={quickSalePhone}
                  onChange={(e) => setQuickSalePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="vqs__methods">
              <span className="vqs__label">Método de pago</span>
              <div className="vqs__method-pills">
                {["Efectivo", "Débito", "Crédito", "Transferencia"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`vqs__pill${quickSaleMethod === m ? " vqs__pill--active" : ""}`}
                    onClick={() => setQuickSaleMethod(m)}
                  >{m}</button>
                ))}
              </div>
            </div>

            <div className="vqs__shipping-toggle">
              <button
                type="button"
                className={`vqs__ship-check${quickSaleShipping ? " vqs__ship-check--on" : ""}`}
                onClick={() => setQuickSaleShipping(v => !v)}
                aria-pressed={quickSaleShipping}
              >
                <span className="vqs__ship-check-box">
                  {quickSaleShipping && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                Incluir envío
              </button>
            </div>

            {quickSaleShipping && (
              <div className="vqs__ship-fields">
                <div className="vqs__row vqs__row--fields">
                  <div className="vqs__field vqs__field--qty">
                    <label className="vqs__label">Costo de envío (UYU)</label>
                    <input
                      className="vqs__input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={quickSaleShipCost}
                      onChange={(e) => setQuickSaleShipCost(e.target.value)}
                    />
                  </div>
                  <div className="vqs__field">
                    <label className="vqs__label">Dirección</label>
                    <input
                      className="vqs__input"
                      type="text"
                      placeholder="Calle, número, apto..."
                      value={quickSaleAddress}
                      onChange={(e) => setQuickSaleAddress(e.target.value)}
                    />
                  </div>
                  <div className="vqs__field">
                    <label className="vqs__label">Departamento / Localidad</label>
                    <input
                      className="vqs__input"
                      type="text"
                      placeholder="Ej: Montevideo"
                      value={quickSaleDpto}
                      onChange={(e) => setQuickSaleDpto(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedQuickProduct && (
              <div className="vqs__summary">
                <span className="vqs__summary-item">
                  <span className="vqs__summary-label">Producto</span>
                  <strong>{selectedQuickProduct.name}</strong>
                </span>
                <span className="vqs__summary-sep">·</span>
                <span className="vqs__summary-item">
                  <span className="vqs__summary-label">Cantidad</span>
                  <strong>{quickSaleQty}</strong>
                </span>
                <span className="vqs__summary-sep">·</span>
                <span className="vqs__summary-item">
                  <span className="vqs__summary-label">Método</span>
                  <strong>{quickSaleMethod}</strong>
                </span>
                {quickSaleShipping && quickSaleShipAmt > 0 && (
                  <>
                    <span className="vqs__summary-sep">·</span>
                    <span className="vqs__summary-item">
                      <span className="vqs__summary-label">Envío</span>
                      <strong>${quickSaleShipAmt.toLocaleString("es-UY")}</strong>
                    </span>
                  </>
                )}
                <span className="vqs__summary-sep">·</span>
                <span className="vqs__summary-total">
                  ${quickSaleTotal.toLocaleString("es-UY")}
                </span>
              </div>
            )}

            {quickSaleError && <p className="stk__sale-error">{quickSaleError}</p>}

            <button
              type="submit"
              className="vqs__submit"
              disabled={!quickSaleProd || !selectedQuickProduct || selectedQuickProduct.stock === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirmar venta
            </button>
          </form>
        )}

        {quickSalesLog.length > 0 && (
          <div className="ventas-quick-log">
            <p className="ventas-section-title" style={{ marginTop: "1.5rem" }}>
              Ventas de esta sesión &nbsp;
              <span className="vqs__log-count">{quickSalesLog.length}</span>
            </p>
            <div className="stk__table-wrap">
              <table className="stk__table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Producto</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th>Cant.</th>
                    <th>Total</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {quickSalesLog.map((entry) => (
                    <tr key={entry.id} className="stk__row">
                      <td className="stk__col-thumb">
                        {entry.productImg
                          ? <img src={entry.productImg} alt={entry.productName} className="stk__thumb" />
                          : <div className="stk__thumb stk__thumb--placeholder" />
                        }
                      </td>
                      <td className="stk__col-name">{entry.productName}</td>
                      <td className="vqs__log-customer">{entry.customer}</td>
                      <td><span className="vqs__log-method">{entry.method}</span></td>
                      <td><span className="stk__qty--minus">−{entry.quantity}</span></td>
                      <td className="vqs__log-total">${(entry.total || 0).toLocaleString("es-UY")}</td>
                      <td className="stk__log-date">{fmtDateTime(entry.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="ventas-filters">
        <input
          className="ventas-search"
          placeholder="Buscar por nombre o email..."
          value={salesSearch}
          onChange={e => { setSalesSearch(e.target.value); setSalesPage(1); }}
        />
        <select className="ventas-select" value={salesStatusFilter} onChange={e => { setSalesStatusFilter(e.target.value); setSalesPage(1); }}>
          <option value="todas">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="enviado">Enviado</option>
          <option value="entregado">Entregado</option>
        </select>
        <select className="ventas-select" value={salesDateFilter} onChange={e => { setSalesDateFilter(e.target.value); setSalesPage(1); }}>
          <option value="todo">Todo el tiempo</option>
          <option value="hoy">Hoy</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <button className="ventas-export-btn" onClick={exportSalesToExcel} disabled={!orders || orders.length === 0}>
          ↓ Exportar Excel
        </button>
        <button
          className="ventas-export-btn"
          style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)", color: "#22c55e" }}
          onClick={async () => {
            const { ok, fail, total } = await syncEntregadosToSheets();
            if (total === 0) {
              toast.success("No hay órdenes entregadas para sincronizar.");
            } else if (fail === 0) {
              toast.success(`✓ ${ok} orden${ok !== 1 ? "es" : ""} sincronizada${ok !== 1 ? "s" : ""} al Google Sheet`);
            } else if (ok === 0) {
              toast.error(`✗ Error al sincronizar: verificá que el escenario de Make esté activo en make.com`);
            } else {
              toast.error(`${ok} enviadas, ${fail} fallaron — verificá el escenario de Make`);
            }
          }}
          disabled={!orders || orders.length === 0}
        >
          ↑ Sincronizar Sheet
        </button>
        <span className="ventas-count">{filteredOrders.length} orden{filteredOrders.length !== 1 ? "es" : ""}</span>
      </div>

      <div className="vl">
        <div className="vl__head">
          <span className="vl__head-cell">Producto</span>
          <span className="vl__head-cell">Cliente</span>
          <span className="vl__head-cell">Contacto</span>
          <span className="vl__head-cell">Pago</span>
          <span className="vl__head-cell">Cupón</span>
          <span className="vl__head-cell">Envío</span>
          <span className="vl__head-cell" style={{textAlign:"center"}}>Total</span>
          <span className="vl__head-cell">Estado</span>
          <span className="vl__head-cell">Fecha</span>
          <span className="vl__head-cell"></span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="vl__empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <p>{(orders || []).length === 0 ? "No hay ventas registradas aún." : "Ninguna venta coincide con los filtros."}</p>
          </div>
        ) : pagedOrders.map(o => {
          const isExpanded = expandedOrderId === o.id;
          const statusMap = {
            confirmado: { cls: "ventas-status--confirmed",  label: "Confirmado"     },
            armando:    { cls: "ventas-status--preparing",  label: "Armando pedido" },
            enviado:    { cls: "ventas-status--shipped",    label: "Enviado"        },
            entregado:  { cls: "ventas-status--delivered",  label: "Entregado"      },
            reclamo:    { cls: "ventas-status--claim",      label: "Reclamo"        },
          };
          const normalizedStatus = o.status === "pendiente" ? "confirmado" : o.status;
          const statusInfo = statusMap[normalizedStatus] || statusMap.confirmado;
          const firstItem  = (o.items || [])[0];
          const itemCount  = (o.items || []).length;
          const isAdmin    = o.source === "admin";

          return (
            <div key={o.id} className={`vl__row${isExpanded ? " vl__row--open" : ""}`}>

              <div className="vl__cols" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>

                <div className="vl__col vl__col--product">
                  {firstItem?.image
                    ? <img src={firstItem.image} alt={firstItem.name} className="vl__thumb" />
                    : <div className="vl__thumb vl__thumb--empty" />
                  }
                  <div className="vl__product-info">
                    <span className="vl__product-name">
                      {firstItem?.name || "—"}
                      {itemCount > 1 && <span className="vl__product-more">+{itemCount - 1}</span>}
                    </span>
                    <span className="vl__order-id">#{formatOrderNumber(o)}</span>
                    {isAdmin && <span className="vl__source-badge">Venta directa</span>}
                  </div>
                </div>

                <div className="vl__col vl__col--client">
                  <span className="vl__client-name">{o.user_name || "—"}</span>
                </div>

                <div className="vl__col vl__col--contact" onClick={e => e.stopPropagation()}>
                  {o.user_email && (
                    <a href={`mailto:${o.user_email}`} className="vl__contact-btn" title={o.user_email}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {o.user_email}
                    </a>
                  )}
                  {o.user_phone && (
                    <a href={`tel:${o.user_phone}`} className="vl__contact-btn" title={o.user_phone}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                      </svg>
                      {o.user_phone}
                    </a>
                  )}
                  {!o.user_email && !o.user_phone && <span className="vl__no-contact">—</span>}
                </div>

                <div className="vl__col">
                  <span className="vl__method">{o.payment_method || "—"}</span>
                </div>

                <div className="vl__col">
                  {o.coupon_code
                    ? <span className="vl__coupon">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                          <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                        {o.coupon_code}
                      </span>
                    : <span className="vl__no-coupon">Sin cupón</span>
                  }
                </div>

                <div className="vl__col">
                  {o.shipping == null
                    ? <span className="vl__ship-cost vl__ship-cost--none">—</span>
                    : o.free_shipping || o.shipping === 0
                      ? <span className="vl__ship-cost vl__ship-cost--free">Gratis</span>
                      : <span className="vl__ship-cost vl__ship-cost--paid">${(o.shipping).toLocaleString("es-UY")}</span>
                  }
                </div>

                <div className="vl__col vl__col--total">
                  <span className="vl__total">${(o.total || 0).toLocaleString("es-UY")}</span>
                  {o.discount > 0 && (
                    <span className="vl__discount">−${o.discount.toLocaleString("es-UY")}</span>
                  )}
                </div>

                <div className="vl__col" onClick={e => e.stopPropagation()}>
                  <select
                    className={`ventas-status-select ${statusInfo.cls}`}
                    value={o.status === "pendiente" ? "confirmado" : (o.status || "confirmado")}
                    onChange={e => {
                      const next = e.target.value;
                      if (next === "enviado" || next === "entregado" || next === "reclamo") {
                        const labelMap = { enviado: "Enviado", entregado: "Entregado", reclamo: "Reclamo" };
                        const shouldNotify = next === "enviado" || next === "entregado";
                        setNotifyClient(shouldNotify);
                        setStatusConfirm({ id: o.id, next, label: labelMap[next], order: o });
                        return;
                      }
                      updateOrderStatus(o.id, next);
                      if (next === "armando") {
                        let waUrl = null;
                        if (o.user_phone) {
                          const nombre = o.user_name ? ` ${o.user_name}` : "";
                          const orderId = (o.id || "").toString().slice(0, 8).toUpperCase();
                          const addr = o.shipping_address || {};
                          const productos = (o.items || [])
                            .map(i => `• ${i.name}${(i.qty || i.quantity || 1) > 1 ? ` ×${i.qty || i.quantity}` : ""} — $${((i.price ?? 0) * (i.qty || i.quantity || 1)).toLocaleString("es-UY")}`)
                            .join("\n");
                          const envio = (o.shipping === 0 || o.free_shipping) ? "Gratis ✅" : `$${(o.shipping ?? 0).toLocaleString("es-UY")}`;
                          const dirLine = addr.direccion ? `📍 *Dirección de entrega:* ${addr.direccion}${addr.departamento ? `, ${addr.departamento}` : ""}\n` : "";
                          const msg = [
                            `🚀 ¡Hola${nombre}! Tu pedido *#${orderId}* está siendo preparado.`,
                            ``,
                            `📦 *Productos:*`,
                            productos,
                            ``,
                            `${dirLine}💰 *Total:* $${(o.total ?? 0).toLocaleString("es-UY")} | *Envío:* ${envio}`,
                            ``,
                            `Te avisamos cuando sea enviado. ¡Gracias por tu compra! 🙌`,
                            `*RIXX Lentes*`,
                          ].join("\n");
                          waUrl = `https://wa.me/${toWaNumber(o.user_phone)}?text=${encodeURIComponent(msg)}`;
                        }
                        setShippingLabelOrder({ ...o, _waUrl: waUrl });
                      }
                    }}
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="armando">Armando pedido</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="reclamo">Reclamo</option>
                  </select>
                </div>

                <div className="vl__col vl__col--date">
                  {o.created_at
                    ? <>
                        <span>{new Date(o.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "short" })}</span>
                        <span className="vl__time">{new Date(o.created_at).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}</span>
                      </>
                    : "—"
                  }
                </div>

                <div className="vl__col vl__col--actions" onClick={e => e.stopPropagation()}>
                  {o.user_phone && normalizedStatus === "confirmado" && !o.confirmation_sent && (
                    <button
                      className="vl__action-btn vl__action-btn--confirm"
                      title="Enviar confirmación al cliente"
                      onClick={() => {
                        const nombre = o.user_name ? ` ${o.user_name}` : "";
                        const orderId = (o.id || "").toString().slice(0, 8).toUpperCase();
                        const msg = [
                          `Hola${nombre}! 👋 Tu pedido *#${orderId}* fue confirmado. ✅`,
                          ``,
                          `Para continuar con la preparación necesitamos que realices el pago *antes de las 24hs*. Te dejamos las formas disponibles:`,
                          ``,
                          `💳 *Transferencia bancaria (BROU)*`,
                          `• Titular: RIXX Lentes`,
                          `• Cuenta corriente: 001-234567/8`,
                          `• RUT: 21.234.567-0`,
                          ``,
                          `🏦 *RedPagos / Abitab*`,
                          `• Código: 7821-4563`,
                          ``,
                          `📱 *Mercado Pago*`,
                          `• Alias: rixx.lentes`,
                          ``,
                          `Una vez realizado el pago, envianos el *comprobante por este chat* y tu paquete pasa directo a preparación para envío. 📦`,
                          ``,
                          `¡Gracias por tu compra! 🙌`,
                          `*RIXX Lentes*`,
                        ].join("\n");
                        const waUrl = `https://wa.me/${toWaNumber(o.user_phone)}?text=${encodeURIComponent(msg)}`;
                        updateOrderFields(o.id, { confirmation_sent: true });
                        window.open(waUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                  )}
                  {o.user_phone && (
                    <a
                      href={`https://wa.me/${toWaNumber(o.user_phone)}?text=${encodeURIComponent(`Hola ${o.user_name || ""}, te contactamos de RIXX Lentes por tu pedido #${(o.id || "").toString().slice(0, 8).toUpperCase()}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vl__action-btn vl__action-btn--wa"
                      title="WhatsApp"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  )}
                  <button
                    className="vl__action-btn"
                    onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                    title={isExpanded ? "Cerrar" : "Ver detalle"}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                    </svg>
                  </button>
                  <button
                    className="vl__action-btn vl__action-btn--delete"
                    title="Eliminar pedido"
                    onClick={() => setOrderDeleteConfirm(o)}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="vl__detail">

                  <div className="vl__detail-block">
                    <p className="ventas-detail-label">Cliente</p>
                    <p className="vl__detail-value vl__detail-value--name">{o.user_name || "—"}</p>
                    {o.user_email && (
                      <a href={`mailto:${o.user_email}`} className="vl__detail-link">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        {o.user_email}
                      </a>
                    )}
                    {o.user_phone && (
                      <a href={`tel:${o.user_phone}`} className="vl__detail-link">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                        </svg>
                        {o.user_phone}
                      </a>
                    )}
                  </div>

                  <div className="vl__detail-block">
                    <p className="ventas-detail-label">Dirección de envío</p>
                    <p className="vl__detail-value">{o.shipping_address?.direccion || "—"}</p>
                    {o.shipping_address?.departamento && (
                      <p className="vl__detail-value">{o.shipping_address.departamento}</p>
                    )}
                    {o.shipping_address?.cp && (
                      <p className="vl__detail-value">CP {o.shipping_address.cp}</p>
                    )}
                  </div>

                  <div className="vl__detail-block">
                    <p className="ventas-detail-label">Pago</p>
                    <p className="vl__detail-value">{o.payment_method || "—"}</p>
                    {o.coupon_code && (
                      <p className="vl__detail-coupon">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                          <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                        Cupón: <strong>{o.coupon_code}</strong>
                        {o.discount > 0 && ` (−$${o.discount.toLocaleString("es-UY")})`}
                      </p>
                    )}
                    {o.notes && <p className="vl__detail-notes">📝 {o.notes}</p>}
                    {isAdmin && <p className="vl__detail-source">Origen: Venta directa (admin)</p>}
                  </div>

                  <div className="vl__detail-items">
                    <p className="ventas-detail-label">Productos</p>
                    {(o.items || []).map((item, idx) => {
                      const itemQty = item.qty || item.quantity || 1;
                      const itemSubtotal = (item.price || 0) * itemQty;
                      return (
                        <div key={idx} className="vl__detail-item">
                          {item.image && <img src={item.image} alt={item.name} className="vl__detail-item__img" />}
                          <span className="vl__detail-item__name">{item.name}</span>
                          <span className="vl__detail-item__qty">× {itemQty}</span>
                          <span className="vl__detail-item__unit">${(item.price || 0).toLocaleString("es-UY")} c/u</span>
                          <span className="vl__detail-item__sub">${itemSubtotal.toLocaleString("es-UY")}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="vl__detail-totals">
                    <div className="vl__detail-total-row">
                      <span>Subtotal</span>
                      <span>${(o.subtotal || o.total || 0).toLocaleString("es-UY")}</span>
                    </div>
                    {o.discount > 0 && (
                      <div className="vl__detail-total-row vl__detail-total-row--discount">
                        <span>Descuento {o.coupon_code && `(${o.coupon_code})`}</span>
                        <span>−${o.discount.toLocaleString("es-UY")}</span>
                      </div>
                    )}
                    <div className="vl__detail-total-row">
                      <span>Envío</span>
                      {o.free_shipping || o.shipping === 0
                        ? <span className="vl__detail-value--free">Gratis</span>
                        : <span>${(o.shipping || 0).toLocaleString("es-UY")}</span>
                      }
                    </div>
                    <div className="vl__detail-total-row vl__detail-total-row--final">
                      <span>Total</span>
                      <span>${(o.total || 0).toLocaleString("es-UY")}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length > ORDERS_PER_PAGE && (
          <div className="vl__pagination">
            <span className="vl__pagination-info">
              Mostrando {Math.min((salesPage-1)*ORDERS_PER_PAGE+1, filteredOrders.length)}–{Math.min(salesPage*ORDERS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length} pedidos
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button
                onClick={() => setSalesPage(p => p - 1)}
                disabled={salesPage === 1}
                className={"vl__page-btn" + (salesPage === 1 ? " vl__page-btn--disabled" : "")}
              >← Anterior</button>
              <span className="vl__pagination-info" style={{ minWidth:80, textAlign:"center" }}>
                Página {salesPage} de {totalPages}
              </span>
              <button
                onClick={() => setSalesPage(p => p + 1)}
                disabled={salesPage >= totalPages}
                className={"vl__page-btn" + (salesPage >= totalPages ? " vl__page-btn--disabled" : "")}
              >Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {shippingLabelOrder && (
        <ShippingLabelModal
          order={shippingLabelOrder}
          onClose={() => setShippingLabelOrder(null)}
        />
      )}

      {shippingNotifyOrder && (
        <ShippingNotifyModal
          order={shippingNotifyOrder}
          onClose={() => setShippingNotifyOrder(null)}
          onConfirm={() => setShippingNotifyOrder(null)}
        />
      )}

      {orderDeleteConfirm && createPortal(
        <div onClick={() => setOrderDeleteConfirm(null)} style={{ position:"fixed", inset:0, zIndex:200000, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161614", border:"1px solid #272725", borderRadius:12, padding:"28px 28px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }}>
            <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.14em", color:"#D4AF37", fontWeight:700, marginBottom:8 }}>Confirmar eliminación</p>
            <h3 style={{ fontSize:17, fontWeight:700, color:"#ede8df", marginBottom:8 }}>¿Eliminar este pedido?</h3>
            <p style={{ fontSize:13, color:"#6a6460", marginBottom:4, lineHeight:1.5 }}>
              Pedido <strong style={{ color:"#ede8df" }}>#{(orderDeleteConfirm.id || "").toString().slice(0, 8).toUpperCase()}</strong>
              {orderDeleteConfirm.user_name ? ` — ${orderDeleteConfirm.user_name}` : ""}
            </p>
            <p style={{ fontSize:12, color:"#6a6460", marginBottom:20, lineHeight:1.5 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setOrderDeleteConfirm(null)} style={{ padding:"8px 18px", background:"transparent", border:"1px solid #272725", borderRadius:8, color:"#6a6460", cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
              <button
                onClick={() => { deleteOrder(orderDeleteConfirm.id); setOrderDeleteConfirm(null); }}
                style={{ padding:"8px 18px", background:"rgba(220,50,50,0.12)", border:"1px solid rgba(220,50,50,0.35)", borderRadius:8, color:"#e05555", cursor:"pointer", fontSize:13, fontWeight:600 }}
              >Eliminar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {statusConfirm && createPortal(
        <div onClick={() => setStatusConfirm(null)} style={{ position:"fixed", inset:0, zIndex:200000, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161614", border:"1px solid #272725", borderRadius:12, padding:"28px 28px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }}>
            <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.14em", color:"#D4AF37", fontWeight:700, marginBottom:8 }}>Confirmar cambio</p>
            <h3 style={{ fontSize:17, fontWeight:700, color:"#ede8df", marginBottom:8 }}>¿Cambiar a {statusConfirm.label}?</h3>
            <p style={{ fontSize:13, color:"#6a6460", marginBottom: statusConfirm.next === "entregado" ? 10 : 16, lineHeight:1.5 }}>Esta acción es difícil de revertir. ¿Estás seguro?</p>
            {statusConfirm.next === "entregado" && (
              <p style={{ fontSize:12, color:"#4caf82", marginBottom:16, lineHeight:1.5, background:"rgba(76,175,130,0.08)", border:"1px solid rgba(76,175,130,0.2)", borderRadius:6, padding:"8px 12px" }}>
                📋 Se registrará automáticamente en Google Sheet.
              </p>
            )}
            {(statusConfirm.next === "enviado" || statusConfirm.next === "entregado") && (
              <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={notifyClient}
                  onChange={e => setNotifyClient(e.target.checked)}
                  style={{ width:15, height:15, accentColor:"#D4AF37", cursor:"pointer" }}
                />
                <span style={{ fontSize:13, color:"#ede8df" }}>Notificar al cliente por WhatsApp</span>
              </label>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setStatusConfirm(null)} style={{ padding:"8px 18px", background:"transparent", border:"1px solid #272725", borderRadius:8, color:"#6a6460", cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
              <button
                onClick={() => {
                  const { id, next, order } = statusConfirm;
                  if (notifyClient && (next === "enviado" || next === "entregado") && order.user_phone) {
                    const nombre = order.user_name || "";
                    const ordNum = formatOrderNumber(order);
                    const msg = next === "enviado"
                      ? `Hola ${nombre}! 👋 Tu pedido *#${ordNum}* ya fue enviado y está en camino. En breve lo recibirás. ¡Gracias por tu compra en RIXX! 🕶️`
                      : `Hola ${nombre}! ✅ Tu pedido *#${ordNum}* fue marcado como entregado. Esperamos que lo disfrutes. ¡Gracias por elegir RIXX! 🕶️`;
                    window.open(`https://wa.me/${toWaNumber(order.user_phone)}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                  }
                  if (next === "enviado") {
                    updateOrderFields(id, { status: next, shipped_at: new Date().toISOString() });
                  } else if (next === "entregado") {
                    updateOrderStatus(id, next, order).then(ok => {
                      if (ok) toast.success("✓ Orden marcada como entregada y guardada en Google Sheet");
                      else toast.error("Orden marcada como entregada, pero falló el envío al Sheet — verificá que el escenario de Make esté activo");
                    });
                  } else {
                    updateOrderStatus(id, next, order);
                  }
                  setStatusConfirm(null);
                }}
                style={{ padding:"8px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8, color:"#D4AF37", cursor:"pointer", fontSize:13, fontWeight:600 }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
}
