import { useState, useContext, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import { AuthContext } from "./AuthContext";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { OrdersContext } from "./OrdersContext";
import "../styles/Admin.scss";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import Stock from "./Stock";
import "../styles/Stock.scss";
import { useReviews } from "./ReviewsContext";
import { useToast } from "./ToastContext";
import VentasTab from "./admin/VentasTab";
import ProductosTab from "./admin/ProductosTab";
import CuponesTab from "./admin/CuponesTab";

const Admin = () => {
  const {
    products, addProduct, removeProduct, toggleFeatured,
    updateProduct, markProductsExported,
    changeLog, hasUnsavedChanges, lastSavedAt, clearChangeLog,
    updateProductStatus,
  } = useContext(ProductsContext);
  const { users, createUser, toggleUserStatus, togglePermission } = useContext(AuthContext);
  const { reviews, loading: reviewsLoading, addReview, deleteReview, toggleApproved } = useReviews();
  const { orders, getAllOrders, updateOrderStatus, updateOrderFields, createOrder, deleteOrder, syncEntregadosToSheets } = useContext(OrdersContext);

  const [activeTab, setActiveTab] = useState("Dashboard");

  const [userDeleteConfirm, setUserDeleteConfirm] = useState(null);
  const [reviewDeleteConfirm, setReviewDeleteConfirm] = useState(null);

  const ALL_PERMS = ["Productos", "Stock", "Usuarios", "Ventas"];
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", password: "", role: "Empleado", permissions: [] });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("Todos");
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [userCreateMsg, setUserCreateMsg] = useState(null);

  const { toast } = useToast();

  const [orderToasts, setOrderToasts]     = useState([]);
  const [newOrderCount, setNewOrderCount] = useState(0);

  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 5, comment: "", product_name: "" });
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewFormSent, setReviewFormSent] = useState(false);

  const playOrderBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => ctx.close();
    } catch { /* audio not supported */ }
  }, []);

  const dismissOrderToast = useCallback((id) => {
    setOrderToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new;
          const toastId = order.id || Date.now();
          const customer = order.user_name || order.user_email || "Cliente nuevo";
          const total    = order.total ?? 0;
          setOrderToasts((prev) => [
            { id: toastId, customer, total, ts: Date.now() },
            ...prev,
          ]);
          setNewOrderCount((n) => n + 1);
          playOrderBeep();
          setTimeout(() => dismissOrderToast(toastId), 5000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playOrderBeep, dismissOrderToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "Ventas") setNewOrderCount(0); }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Ventas") getAllOrders();
  }, [activeTab, getAllOrders]);

  useEffect(() => {
    if (activeTab !== "Ventas" || orders.length === 0) return;
    const now = Date.now();
    orders.forEach(o => {
      if (o.status === "enviado" && o.shipped_at) {
        const elapsed = now - new Date(o.shipped_at).getTime();
        if (elapsed >= 24 * 60 * 60 * 1000) {
          updateOrderStatus(o.id, "entregado");
          toast.info("Pedido marcado como entregado automáticamente");
        }
      }
    });
  }, [orders, activeTab, updateOrderStatus, toast]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock <= 5).length;
    const productsOut = products.filter((p) => p.stock === 0).length;
    const categories = [...new Set(products.map((p) => p.category))].length;
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock || 0), 0);
    const topExpensive = [...products].sort((a, b) => b.price - a.price).slice(0, 3);
    const recentProducts = [...products].sort((a, b) => b.id - a.id).slice(0, 5);
    const noImage = products.filter((p) => !p.image || p.image === "").length;
    const noCosto = products.filter((p) => !p.precioCosto).length;
    const exhaustedRate = Math.round((productsOut / (totalProducts || 1)) * 100);
    return { totalProducts, lowStock, productsOut, categories, totalValue, topExpensive, recentProducts, noImage, noCosto, exhaustedRate };
  }, [products]);

  const chartData = useMemo(() => {
    const counts = {};
    products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return Object.keys(counts).map((key) => ({ category: key || "Sin categoría", count: counts[key] }));
  }, [products]);

  const salesKPIs = useMemo(() => {
    const pending = (orders || []).filter(o => o.status === "pendiente").length;
    return { pending };
  }, [orders]);

  const formatPrice = (price) => "$" + Math.round(price).toLocaleString("es-UY");

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewUserPermToggle = (perm) => {
    setNewUserForm((prev) => {
      const has = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm],
      };
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.password.trim()) {
      setUserCreateMsg({ type: "error", text: "La contraseña es obligatoria." });
      setTimeout(() => setUserCreateMsg(null), 3000);
      return;
    }
    const success = await createUser(
      newUserForm.email, newUserForm.password, newUserForm.name,
      newUserForm.role, newUserForm.permissions
    );
    if (success) {
      setUserCreateMsg({ type: "success", text: `Usuario ${newUserForm.name} creado como ${newUserForm.role}.` });
      setNewUserForm({ name: "", email: "", password: "", role: "Empleado", permissions: [] });
    } else {
      setUserCreateMsg({ type: "error", text: "Error al crear usuario. El email ya existe o los datos son inválidos." });
    }
    setTimeout(() => setUserCreateMsg(null), 3000);
  };

  const TABS = [
    {
      id: "Dashboard", label: "Dashboard",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      id: "Productos", label: "Productos",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "Stock", label: "Stock",
      badge: stats.lowStock + stats.productsOut,
      badgeColor: stats.lowStock + stats.productsOut > 0 ? "#ef4444" : null,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 8V11M8 5.5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "Usuarios", label: "Usuarios",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "Ventas", label: "Ventas",
      badge: newOrderCount > 0 ? newOrderCount : (salesKPIs?.pending || 0) || null,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h1.5l1.8 7.5h7l1.2-5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="7" cy="13" r="1" fill="currentColor"/>
          <circle cx="11" cy="13" r="1" fill="currentColor"/>
        </svg>
      ),
    },
    {
      id: "Reseñas", label: "Reseñas",
      badge: reviews.filter(r => !r.approved).length || null,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 2H4a2 2 0 00-2 2v6a2 2 0 002 2h1l2 2 2-2h3a2 2 0 002-2V4a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 6l.5 1.5H10L8.75 8.4l.5 1.6L8 9.1l-1.25.9.5-1.6L6 7.5h1.5L8 6z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "Cupones", label: "Cupones",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="4" width="14" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 8h.01M8 8h.01M11 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M1 6.5h14M1 9.5h14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2"/>
        </svg>
      ),
    },
  ];

  return (
    <>
    <div className="admin-page">

      <div className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-text">RIXX</span>
          <span className="admin-sidebar__brand-sub">Admin Panel</span>
        </div>
        <nav className="admin-sidebar__nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-item__icon">{tab.icon}</span>
              <span className="sidebar-item__label">{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  className="sidebar-item__badge"
                  style={tab.badgeColor ? { backgroundColor: tab.badgeColor, color: "#fff" } : undefined}
                >{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__ai">
          <Link to="/dashboard" className="sidebar-ai-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            CEO AI Dashboard
          </Link>
        </div>
        <div className="admin-sidebar__footer">
          <span className="admin-sidebar__version">v1.0 · RIXX Lentes</span>
        </div>
      </div>

      <div className="admin-main">
        <h1>{activeTab}</h1>

        {/* ════════ DASHBOARD ════════ */}
        {activeTab === "Dashboard" && (
          <div className="dashboard">

            {products.length === 0 && (
              <div className="dashboard-empty">
                Aún no hay productos cargados.{" "}
                <button className="dashboard-empty__link" onClick={() => setActiveTab("Productos")}>
                  Agregá tu primer producto desde la pestaña Productos.
                </button>
              </div>
            )}

            {(stats.productsOut > 0 || stats.lowStock > 0) && (
              <div className="alert-banner">
                <span>⚠ {stats.productsOut} agotados · {stats.lowStock} en stock crítico</span>
                <span
                  className="alert-banner__link"
                  onClick={() => setActiveTab("Productos")}
                >
                  Ver productos críticos →
                </span>
              </div>
            )}

            <div className="stat-cards-grid">

              <div className="stat-card">
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 10h8M6 7h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="stat-card__number">{stats.totalProducts}</div>
                <div className="stat-card__label">Total Productos</div>
              </div>

              <div className={`stat-card ${stats.lowStock > 0 ? "alert-amber" : ""}`}>
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3L18 17H2L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M10 9v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className={`stat-card__number ${stats.lowStock > 0 ? "amber" : ""}`}>{stats.lowStock}</div>
                <div className="stat-card__label">Stock Bajo (≤5)</div>
              </div>

              <div className={`stat-card ${stats.productsOut > 0 ? "alert-red" : ""}`}>
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className={`stat-card__number ${stats.productsOut > 0 ? "red" : ""}`}>{stats.productsOut}</div>
                <div className="stat-card__label">Agotados</div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="stat-card__number">{stats.categories}</div>
                <div className="stat-card__label">Categorías</div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2v16M6.5 5.5C6.5 4.12 7.62 3 9 3h2c1.38 0 2.5 1.12 2.5 2.5S12.38 8 11 8H9C7.62 8 6.5 9.12 6.5 10.5S7.62 13 9 13h2c1.38 0 2.5 1.12 2.5 2.5S12.38 18 11 18H9c-1.38 0-2.5-1.12-2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="stat-card__number">{formatPrice(stats.totalValue)}</div>
                <div className="stat-card__label">Valor Total</div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="7" cy="9" r="1.5" fill="currentColor"/>
                    <path d="M2 14l5-5 4 4 3-3 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-card__number">{stats.noImage}</div>
                <div className="stat-card__label">Sin imagen</div>
              </div>

              <div className={`stat-card ${stats.noCosto > 0 ? "alert-amber" : ""}`}>
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2v16M6.5 5.5C6.5 4.12 7.62 3 9 3h2c1.38 0 2.5 1.12 2.5 2.5S12.38 8 11 8H9C7.62 8 6.5 9.12 6.5 10.5S7.62 13 9 13h2c1.38 0 2.5 1.12 2.5 2.5S12.38 18 11 18H9c-1.38 0-2.5-1.12-2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className={`stat-card__number ${stats.noCosto > 0 ? "amber" : ""}`}>{stats.noCosto}</div>
                <div className="stat-card__label">Sin precio costo</div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="6" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="14" cy="13" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 16L16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="stat-card__number">{stats.exhaustedRate}%</div>
                <div className="stat-card__label">Tasa agotados</div>
              </div>

            </div>

            <div className="dashboard-bottom">
              <div className="chart-card">
                <h3 className="chart-title">Distribución por categoría</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} barSize={32}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#a08020" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "#99907c", fontSize: 12 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#99907c", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px" }}
                      labelStyle={{ color: "#D4AF37", fontFamily: "Manrope" }}
                      itemStyle={{ color: "#D4AF37" }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="dashboard-side">
                <div className="recent-products">
                  <h3>Últimos agregados</h3>
                  <table className="recent-table">
                    <tbody>
                      {stats.recentProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="rt-name">{p.name}</td>
                          <td className="rt-price">{formatPrice(p.price)}</td>
                          <td className="rt-stock">Stock: {p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="top-expensive">
                  <h3>Top 3 más caros</h3>
                  <ul>
                    {stats.topExpensive.map((p) => (
                      <li key={p.id}>{p.name} — {formatPrice(p.price)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════ PRODUCTOS ════════ */}
        {activeTab === "Productos" && (
          <ProductosTab
            products={products}
            orders={orders}
            addProduct={addProduct}
            removeProduct={removeProduct}
            toggleFeatured={toggleFeatured}
            updateProduct={updateProduct}
            markProductsExported={markProductsExported}
            changeLog={changeLog}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSavedAt={lastSavedAt}
            clearChangeLog={clearChangeLog}
            updateProductStatus={updateProductStatus}
          />
        )}

        {/* ════════ STOCK ════════ */}
        {activeTab === "Stock" && (
          <div>
            {(() => {
              const criticalProducts = products.filter((p) => p.stock <= 5);
              if (criticalProducts.length === 0) return null;
              return (
                <div style={{
                  background: "linear-gradient(135deg, #1a0a0a 0%, #161614 100%)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                  boxShadow: "0 0 24px rgba(239,68,68,0.08)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "32px", height: "32px", borderRadius: "8px",
                      background: "rgba(239,68,68,0.15)", flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L14.5 13H1.5L8 2Z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M8 6v3.5M8 11v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#ef4444", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Alertas de stock crítico
                      </h3>
                      <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
                        {criticalProducts.length} {criticalProducts.length === 1 ? "producto" : "productos"} con 5 unidades o menos
                      </p>
                    </div>
                    <span style={{
                      marginLeft: "auto", background: "#ef4444", color: "#fff",
                      borderRadius: "999px", padding: "2px 10px", fontSize: "12px", fontWeight: 700,
                    }}>
                      {criticalProducts.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {criticalProducts.sort((a, b) => a.stock - b.stock).map((p) => {
                      const isOut    = p.stock === 0;
                      const color    = isOut ? "#ef4444" : p.stock <= 2 ? "#ef4444" : "#f97316";
                      const bgColor  = isOut ? "rgba(239,68,68,0.08)" : p.stock <= 2 ? "rgba(239,68,68,0.06)" : "rgba(249,115,22,0.06)";
                      const bdColor  = isOut ? "rgba(239,68,68,0.25)" : p.stock <= 2 ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)";
                      const label    = isOut ? "AGOTADO" : `${p.stock} ud.`;
                      return (
                        <div key={p.id} style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          background: bgColor,
                          border: `1px solid ${bdColor}`,
                          borderRadius: "8px",
                          padding: "10px 14px",
                        }}>
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}
                            />
                          ) : (
                            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/><path d="M2 11l4-4 3 3 2-2 3 3" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.name}
                            </p>
                            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                              {p.category || "Sin categoría"}
                            </p>
                          </div>

                          <span style={{
                            background: isOut ? "#ef4444" : `${color}22`,
                            color: color,
                            border: `1px solid ${color}55`,
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}>
                            {label}
                          </span>

                          <button
                            onClick={() => setActiveTab("Productos")}
                            style={{
                              flexShrink: 0,
                              background: "rgba(212,175,55,0.1)",
                              border: "1px solid rgba(212,175,55,0.3)",
                              borderRadius: "6px",
                              color: "#D4AF37",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "5px 12px",
                              cursor: "pointer",
                              letterSpacing: "0.03em",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(212,175,55,0.1)"}
                          >
                            Editar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <Stock
              onEditProduct={() => setActiveTab("Productos")}
            />
          </div>
        )}

        {/* ════════ USUARIOS ════════ */}
        {activeTab === "Usuarios" && (
          <div className="users-tab">

            <div className="users-card">
              <h2 className="users-title">Nuevo empleado</h2>
              {userCreateMsg && (
                <div className={`user-msg ${userCreateMsg.type}`}>{userCreateMsg.text}</div>
              )}
              <form className="admin-form users-form" onSubmit={handleCreateUser}>
                <div className="form-row">
                  <input name="name" value={newUserForm.name} onChange={handleNewUserChange} placeholder="Nombre completo" required />
                  <input name="email" value={newUserForm.email} onChange={handleNewUserChange} placeholder="Email" type="email" required />
                </div>
                <div className="form-row">
                  <input name="password" value={newUserForm.password} onChange={handleNewUserChange} placeholder="Contraseña" type="password" required />
                </div>
                <div className="form-row">
                  <select name="role" value={newUserForm.role} onChange={handleNewUserChange}>
                    <option value="Empleado">Empleado</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <div className="form-perms">
                  <span className="form-perms__label">Permisos:</span>
                  {ALL_PERMS.map((perm) => (
                    <label key={perm} className="checkbox">
                      <input
                        type="checkbox"
                        checked={newUserForm.permissions.includes(perm)}
                        onChange={() => handleNewUserPermToggle(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
                <button className="primary-btn">Crear usuario</button>
              </form>
            </div>

            <div className="users-card">
              <div className="users-header">
                <h2 className="users-title">Usuarios del sistema</h2>
                <span>Total: {(users || []).length}</span>
              </div>
              <div className="users-filters">
                <input
                  placeholder="Buscar por nombre o email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="Administrador">Administradores</option>
                  <option value="Empleado">Empleados</option>
                  <option value="Cliente">Clientes</option>
                </select>
              </div>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || [])
                    .filter((u) => {
                      const match =
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const role = userRoleFilter === "Todos" || u.role === userRoleFilter;
                      return match && role;
                    })
                    .map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role === "Administrador" ? "admin" : u.role === "Empleado" ? "employee" : "client"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.active === false ? "inactive" : "active"}`}>
                            {u.active === false ? "Inactivo" : "Activo"}
                          </span>
                        </td>
                        <td className="actions">
                          <button className="action-btn view" onClick={() => setSelectedUser(u)}>Ver</button>
                          <button className="action-btn perms" onClick={() => setPermissionsUser(u)}>Permisos</button>
                          <button className="action-btn danger" onClick={() => setUserDeleteConfirm(u)}>Desactivar</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {selectedUser && (
              <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h2>{selectedUser.name}</h2>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Rol:</strong> {selectedUser.role}</p>
                  <button className="primary-btn" onClick={() => setSelectedUser(null)}>Cerrar</button>
                </div>
              </div>
            )}

            {permissionsUser && (
              <div className="modal-overlay" onClick={() => setPermissionsUser(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h2>Permisos de {permissionsUser.name}</h2>
                  {ALL_PERMS.map((perm) => (
                    <label key={perm} className="checkbox">
                      <input
                        type="checkbox"
                        checked={(permissionsUser.permissions || []).includes(perm)}
                        onChange={() => {
                          togglePermission(permissionsUser.id, perm);
                          setPermissionsUser((prev) => {
                            const perms = prev.permissions || [];
                            const newPerms = perms.includes(perm)
                              ? perms.filter((p) => p !== perm)
                              : [...perms, perm];
                            return { ...prev, permissions: newPerms };
                          });
                        }}
                      />
                      {perm}
                    </label>
                  ))}
                  <button className="primary-btn" onClick={() => setPermissionsUser(null)}>Cerrar</button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ════════ VENTAS ════════ */}
        {activeTab === "Ventas" && (
          <VentasTab
            orders={orders}
            products={products}
            updateOrderStatus={updateOrderStatus}
            updateOrderFields={updateOrderFields}
            createOrder={createOrder}
            deleteOrder={deleteOrder}
            syncEntregadosToSheets={syncEntregadosToSheets}
            updateProduct={updateProduct}
            toast={toast}
          />
        )}

        {/* ════════ RESEÑAS ════════ */}
        {activeTab === "Reseñas" && (
          <div className="reviews-tab">

            <div className="reviews-tab__header">
              <div className="reviews-tab__filters">
                {["all", "pending", "approved"].map((f) => (
                  <button
                    key={f}
                    className={`reviews-tab__filter-btn${reviewFilter === f ? " active" : ""}`}
                    onClick={() => setReviewFilter(f)}
                  >
                    {f === "all" ? `Todas (${reviews.length})` : f === "pending" ? `Pendientes (${reviews.filter(r => !r.approved).length})` : `Aprobadas (${reviews.filter(r => r.approved).length})`}
                  </button>
                ))}
              </div>
              <button
                className="reviews-tab__add-btn"
                onClick={() => setReviewFormOpen(v => !v)}
              >
                + Nueva reseña
              </button>
            </div>

            {reviewFormOpen && (
              <div className="reviews-tab__form-card">
                {reviewFormSent ? (
                  <p className="reviews-tab__success">Reseña agregada correctamente.</p>
                ) : (
                  <form
                    className="reviews-tab__form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!reviewForm.author_name || !reviewForm.comment) return;
                      await addReview({ ...reviewForm, approved: true, source: "admin" });
                      setReviewFormSent(true);
                      setReviewForm({ author_name: "", rating: 5, comment: "", product_name: "" });
                      setTimeout(() => { setReviewFormSent(false); setReviewFormOpen(false); }, 3000);
                    }}
                  >
                    <div className="reviews-tab__form-row">
                      <input
                        className="reviews-tab__input"
                        placeholder="Nombre del cliente *"
                        value={reviewForm.author_name}
                        onChange={e => setReviewForm(p => ({ ...p, author_name: e.target.value }))}
                        required
                      />
                      <input
                        className="reviews-tab__input"
                        placeholder="Producto (opcional)"
                        value={reviewForm.product_name}
                        onChange={e => setReviewForm(p => ({ ...p, product_name: e.target.value }))}
                      />
                      <select
                        className="reviews-tab__input"
                        value={reviewForm.rating}
                        onChange={e => setReviewForm(p => ({ ...p, rating: Number(e.target.value) }))}
                      >
                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                      </select>
                    </div>
                    <textarea
                      className="reviews-tab__textarea"
                      placeholder="Comentario *"
                      rows={3}
                      value={reviewForm.comment}
                      onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      required
                    />
                    <div className="reviews-tab__form-actions">
                      <button type="button" className="reviews-tab__cancel" onClick={() => setReviewFormOpen(false)}>Cancelar</button>
                      <button type="submit" className="primary-btn reviews-tab__submit">Agregar reseña</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="reviews-tab__list">
              {reviewsLoading && (
                <p className="reviews-tab__empty">Cargando reseñas…</p>
              )}
              {!reviewsLoading && reviews
                .filter(r => reviewFilter === "all" ? true : reviewFilter === "pending" ? !r.approved : r.approved)
                .map(r => (
                  <div key={r.id} className={`reviews-tab__card${r.approved ? " reviews-tab__card--approved" : " reviews-tab__card--pending"}`}>
                    <div className="reviews-tab__card-top">
                      <div className="reviews-tab__card-info">
                        <span className="reviews-tab__card-author">{r.author_name}</span>
                        {r.product_name && <span className="reviews-tab__card-product">— {r.product_name}</span>}
                        <span className="reviews-tab__card-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        <span className={`reviews-tab__badge${r.approved ? " reviews-tab__badge--ok" : " reviews-tab__badge--wait"}`}>
                          {r.approved ? "Aprobada" : "Pendiente"}
                        </span>
                        {r.source === "customer" && <span className="reviews-tab__badge reviews-tab__badge--customer">Cliente</span>}
                      </div>
                      <div className="reviews-tab__card-actions">
                        <button
                          className={`reviews-tab__action-btn${r.approved ? " reviews-tab__action-btn--reject" : " reviews-tab__action-btn--approve"}`}
                          onClick={() => toggleApproved(r.id)}
                          title={r.approved ? "Rechazar" : "Aprobar"}
                        >
                          {r.approved ? "Rechazar" : "Aprobar"}
                        </button>
                        <button
                          className="reviews-tab__action-btn reviews-tab__action-btn--delete"
                          onClick={() => setReviewDeleteConfirm(r.id)}
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <p className="reviews-tab__card-comment">{r.comment}</p>
                    {r.created_at && (
                      <span className="reviews-tab__card-date">
                        {new Date(r.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                ))}
              {!reviewsLoading && reviews.filter(r => reviewFilter === "all" ? true : reviewFilter === "pending" ? !r.approved : r.approved).length === 0 && (
                <p className="reviews-tab__empty">No hay reseñas en esta categoría.</p>
              )}
            </div>

          </div>
        )}

        {/* ════════ CUPONES ════════ */}
        {activeTab === "Cupones" && (
          <CuponesTab />
        )}

      </div>

      {reviewDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setReviewDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__icon">⚠</div>
            <h3>Eliminar reseña</h3>
            <p>¿Estás seguro que querés eliminar esta reseña?</p>
            <p className="confirm-modal__sub">Esta acción no se puede deshacer.</p>
            <div className="confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setReviewDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn-delete"
                onClick={() => { deleteReview(reviewDeleteConfirm); setReviewDeleteConfirm(null); }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {userDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setUserDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__icon">⚠</div>
            <h3>Desactivar usuario</h3>
            <p>¿Estás seguro que querés desactivar a <strong>"{userDeleteConfirm.name}"</strong>?</p>
            <p className="confirm-modal__sub">El usuario no podrá iniciar sesión.</p>
            <div className="confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setUserDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn-delete"
                onClick={() => { toggleUserStatus(userDeleteConfirm.id); setUserDeleteConfirm(null); }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

    {orderToasts.length > 0 && createPortal(
      <div className="order-toasts-container" aria-live="polite" aria-label="Notificaciones de pedidos">
        {orderToasts.map((t) => (
          <div key={t.id} className="order-toast" role="alert">
            <div className="order-toast__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2h1.7l2 8.5h7.8l1.4-5.5H5.5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="15" r="1.1" fill="#D4AF37"/>
                <circle cx="12.5" cy="15" r="1.1" fill="#D4AF37"/>
              </svg>
            </div>
            <div className="order-toast__body">
              <p className="order-toast__label">Nuevo pedido</p>
              <p className="order-toast__customer">{t.customer}</p>
              <p className="order-toast__total">
                ${Number(t.total).toLocaleString("es-UY", { minimumFractionDigits: 0 })}
              </p>
            </div>
            <button
              className="order-toast__close"
              onClick={() => dismissOrderToast(t.id)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    , document.body)}
    </>
  );
};

export default Admin;
