import React, { useState, useContext, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import { AuthContext } from "./AuthContext";
import "../styles/Admin.scss";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import Stock from "./Stock";
import "../styles/Stock.scss";

const Admin = () => {
  const {
    products, addProduct, removeProduct, toggleFeatured,
    updateProduct, markProductsExported,
    changeLog, hasUnsavedChanges, lastSavedAt, clearChangeLog,
    updateProductStatus,
  } = useContext(ProductsContext);
  const { users, createUser, toggleUserStatus, togglePermission } = useContext(AuthContext);

  // ── Tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("Dashboard");

  // ── Producto form / drawer ───────────────────────────────────
  const [form, setForm] = useState({ name: "", price: "", precioCosto: "", image: "", category: "", description: "", stock: 0 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageMode, setImageMode] = useState("url");
  const [imagePreview, setImagePreview] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [flashRow, setFlashRow] = useState(null);

  // ── Filtros Productos ────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [criticalFilter, setCriticalFilter] = useState(false);
  const [marginFilter, setMarginFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [flashExcel, setFlashExcel] = useState(false);
  const [flashFilters, setFlashFilters] = useState(false);

  // ── Sorting ──────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // ── Inline stock edit ────────────────────────────────────────
  const [editingStock, setEditingStock] = useState(null);

  // ── Modales confirmación ─────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userDeleteConfirm, setUserDeleteConfirm] = useState(null);

  // ── Usuarios ─────────────────────────────────────────────────
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", password: "", cloneFromEmail: "admin@admin.com" });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("Todos");
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [userCreateMsg, setUserCreateMsg] = useState(null);

  // ── Debounce búsqueda ────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ── Stats ────────────────────────────────────────────────────
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = filterCategory === "Todas" || p.category === filterCategory;
      let matchesMargin = true;
      if (marginFilter !== "all" && p.precioCosto && p.price) {
        const margin = Math.round((1 - p.precioCosto / p.price) * 100);
        if (marginFilter === "low")  matchesMargin = margin < 20;
        if (marginFilter === "mid")  matchesMargin = margin >= 20 && margin <= 40;
        if (marginFilter === "good") matchesMargin = margin > 40;
      }
      return matchesSearch && matchesCategory && matchesMargin;
    });
  }, [products, debouncedSearch, filterCategory, marginFilter]);

  const sortedFilteredProducts = useMemo(() => {
    let result = criticalFilter
      ? filteredProducts.filter((p) => p.stock <= 5)
      : [...filteredProducts];
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredProducts, sortColumn, sortDir, criticalFilter]);

  const categories = ["Todas", ...new Set(products.map((p) => p.category).filter(Boolean))];

  // ── Helpers ──────────────────────────────────────────────────
  const formatPrice = (price) => "$" + Math.round(price).toLocaleString("es-UY");

  const stockBadgeClass = (stock) => {
    if (stock === 0) return "out";
    if (stock <= 5) return "critical";
    if (stock <= 15) return "low";
    return "ok";
  };

  const handleSort = (column) => {
    if (sortColumn === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortColumn(column); setSortDir("asc"); }
  };

  const getSortIcon = (col) => {
    if (sortColumn !== col) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // ── Form / Drawer ────────────────────────────────────────────
  const triggerFlash = () => {
    setFlashExcel(true);
    setFlashFilters(true);
    setTimeout(() => { setFlashExcel(false); setFlashFilters(false); }, 600);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setForm((prev) => ({ ...prev, image: url }));
  };

  const handleOpenDrawer = () => {
    setEditingProduct(null);
    setForm({ name: "", price: "", precioCosto: "", image: "", category: "", description: "", stock: 0 });
    setImageMode("url");
    setImagePreview("");
    setShowNewCat(false);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
    setForm({ name: "", price: "", precioCosto: "", image: "", category: "", description: "", stock: 0 });
    setImageMode("url");
    setImagePreview("");
    setShowNewCat(false);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price,
      precioCosto: product.precioCosto || "",
      image: product.image || "",
      category: product.category || "",
      description: product.description || "",
      stock: product.stock,
    });
    setImageMode("url");
    setImagePreview("");
    setShowNewCat(false);
    setActiveTab("Productos");
    setDrawerOpen(true);
  };

  const handleAddOrUpdateProduct = (e) => {
    e.preventDefault();
    if (!form.name || form.price === "") return;

    const parsedForm = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      precioCosto: form.precioCosto !== "" ? Number(form.precioCosto) : undefined,
    };

    if (editingProduct) {
      updateProduct({ ...parsedForm, id: editingProduct.id });
      const id = editingProduct.id;
      setFlashRow(id);
      setTimeout(() => setFlashRow(null), 1000);
    } else {
      addProduct(parsedForm);
    }

    handleCloseDrawer();
    triggerFlash();
  };

  const removeProductAndFlag = (id) => {
    removeProduct(id);
    triggerFlash();
  };

  // ── Export Excel (3 hojas) ───────────────────────────────────
  const exportToExcel = () => {
    if (products.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Inventario completo
    const allData = products.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Categoría: p.category || "Sin categoría",
      "Precio (UYU)": p.price,
      "Stock actual": p.stock,
      "Estado stock": p.stock === 0 ? "AGOTADO" : p.stock <= 5 ? "CRÍTICO" : p.stock <= 15 ? "BAJO" : "OK",
      Destacado: p.featured ? "Sí" : "No",
      "Tiene imagen": p.image ? "Sí" : "No",
      Descripción: p.description || "",
      "Valor en stock (UYU)": p.price * p.stock,
    }));
    const ws1 = XLSX.utils.json_to_sheet(allData);
    ws1["!cols"] = [
      { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
      { wch: 40 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws1, "Inventario completo");

    // Hoja 2: Stock crítico
    const criticalData = products
      .filter((p) => p.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => ({
        Nombre: p.name,
        Categoría: p.category || "Sin categoría",
        "Stock actual": p.stock,
        Estado: p.stock === 0 ? "AGOTADO" : "CRÍTICO",
        "Precio (UYU)": p.price,
      }));
    if (criticalData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(criticalData);
      ws2["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(workbook, ws2, "Stock crítico");
    }

    // Hoja 3: Resumen por categoría
    const catMap = {};
    products.forEach((p) => {
      const cat = p.category || "Sin categoría";
      if (!catMap[cat]) catMap[cat] = { total: 0, stockTotal: 0, valorTotal: 0, agotados: 0 };
      catMap[cat].total++;
      catMap[cat].stockTotal += p.stock;
      catMap[cat].valorTotal += p.price * p.stock;
      if (p.stock === 0) catMap[cat].agotados++;
    });
    const summaryData = Object.entries(catMap).map(([cat, data]) => ({
      Categoría: cat,
      Productos: data.total,
      "Stock total": data.stockTotal,
      "Valor total (UYU)": data.valorTotal,
      Agotados: data.agotados,
    }));
    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    ws3["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, ws3, "Resumen categorías");

    // Hoja 4: Rentabilidad
    const rentabilidadData = products.map((p) => {
      const margen = p.precioCosto ? Math.round((1 - p.precioCosto / p.price) * 100) : null;
      const gananciaUnit = p.precioCosto ? p.price - p.precioCosto : null;
      return {
        ID: p.id,
        Nombre: p.name,
        "Precio Costo (UYU)": p.precioCosto || "—",
        "Precio Venta (UYU)": p.price,
        "Margen %": margen !== null ? margen + "%" : "—",
        "Ganancia por unidad": gananciaUnit !== null ? gananciaUnit : "—",
        "Stock actual": p.stock,
        "Ganancia total en stock": gananciaUnit !== null ? gananciaUnit * p.stock : "—",
      };
    });
    const ws4 = XLSX.utils.json_to_sheet(rentabilidadData);
    ws4["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(workbook, ws4, "Rentabilidad");

    // Hoja 5: IVA Uruguay (22%)
    const ivaData = products.map((p) => {
      const precioSinIva = Math.round(p.price / 1.22 * 100) / 100;
      const ivaAmount   = Math.round((p.price - precioSinIva) * 100) / 100;
      return {
        Nombre: p.name,
        "Precio final (con IVA)": p.price,
        "Base imponible (sin IVA)": precioSinIva,
        "IVA 22%": ivaAmount,
        "Stock": p.stock,
        "IVA total en stock": Math.round(ivaAmount * p.stock * 100) / 100,
        "Base imponible total en stock": Math.round(precioSinIva * p.stock * 100) / 100,
      };
    });
    const ws5 = XLSX.utils.json_to_sheet(ivaData);
    ws5["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, ws5, "IVA Uruguay");

    // Hoja 6: Valor de inventario
    const inventarioData = products.map((p) => ({
      Nombre: p.name,
      Stock: p.stock,
      "Costo unitario": p.precioCosto || "—",
      "Valor al costo": p.precioCosto ? p.precioCosto * p.stock : "—",
      "Valor al precio venta": p.price * p.stock,
      "Diferencia (ganancia potencial)": p.precioCosto ? (p.price - p.precioCosto) * p.stock : "—",
    }));
    const ws6 = XLSX.utils.json_to_sheet(inventarioData);
    ws6["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, ws6, "Valor inventario");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `rixx_inventario_${timestamp}.xlsx`);
    markProductsExported();
    triggerFlash();
  };

  // ── Guardar cambios en Excel (inventario + historial) ────────
  const saveChangesToExcel = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Inventario actual
    const allData = products.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Categoría: p.category || "Sin categoría",
      "Precio (UYU)": p.price,
      "Stock actual": p.stock,
      "Estado stock": p.stock === 0 ? "AGOTADO" : p.stock <= 5 ? "CRÍTICO" : p.stock <= 15 ? "BAJO" : "OK",
      Destacado: p.featured ? "Sí" : "No",
      "Tiene imagen": p.image ? "Sí" : "No",
    }));
    const ws1 = XLSX.utils.json_to_sheet(allData);
    ws1["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws1, "Inventario");

    // Hoja 2: Historial de cambios
    if (changeLog.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(
        changeLog.map((c) => ({
          "Fecha y hora": c.timestamp,
          Tipo: c.tipo,
          ID: c.id,
          Producto: c.nombre,
          Detalle: c.detalle || "",
        }))
      );
      ws2["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 6 }, { wch: 26 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, ws2, "Historial de cambios");
    } else {
      const ws2 = XLSX.utils.json_to_sheet([{ Mensaje: "Sin cambios registrados en esta sesión" }]);
      XLSX.utils.book_append_sheet(workbook, ws2, "Historial de cambios");
    }

    // Hoja 3: Resumen — cambios por tipo
    const countByType = changeLog.reduce((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] || 0) + 1;
      return acc;
    }, {});
    const ws3 = XLSX.utils.json_to_sheet(
      Object.entries(countByType).map(([tipo, cantidad]) => ({ "Tipo de cambio": tipo, Cantidad: cantidad }))
    );
    ws3["!cols"] = [{ wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, ws3, "Resumen cambios");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `rixx_cambios_${timestamp}.xlsx`);
    markProductsExported();
    clearChangeLog();
    triggerFlash();
  };

  // ── Imprimir etiquetas de precio ─────────────────────────────
  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const printLabels = () => {
    const win = window.open("", "_blank");
    const rows = products.map((p) => `
      <div class="label">
        <div class="label-name">${escapeHtml(p.name)}</div>
        <div class="label-price">$ ${Number(p.price).toLocaleString("es-UY")}</div>
        <div class="label-id">ID: ${escapeHtml(String(p.id))} · ${escapeHtml(p.category || "")}</div>
      </div>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas RIXX</title>
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #fff; margin: 0; padding: 1rem; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .label { border: 1px solid #ccc; padding: 1rem; text-align: center; page-break-inside: avoid; }
        .label-name { font-size: 13px; font-weight: 600; margin-bottom: 0.5rem; color: #111; }
        .label-price { font-size: 22px; font-weight: 700; color: #B8962E; margin-bottom: 0.25rem; }
        .label-id { font-size: 9px; color: #888; letter-spacing: 0.1em; text-transform: uppercase; }
        @media print { @page { margin: 1cm; } }
      </style></head><body>
      <div style="text-align:center;margin-bottom:1rem;font-size:11px;color:#888;letter-spacing:.2em;text-transform:uppercase">RIXX — Etiquetas de precio</div>
      <div class="grid">${rows}</div>
      <script>window.onload = () => window.print();<\/script>
    </body></html>`);
    win.document.close();
  };

  // ── Usuarios ─────────────────────────────────────────────────
  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const success = createUser(
      newUserForm.email, newUserForm.password,
      newUserForm.name, newUserForm.cloneFromEmail
    );
    if (success) {
      setUserCreateMsg({ type: "success", text: `Usuario ${newUserForm.name} creado con permisos clonados.` });
      setNewUserForm({ name: "", email: "", password: "", cloneFromEmail: "admin@admin.com" });
    } else {
      setUserCreateMsg({ type: "error", text: "Error al crear usuario. El email ya existe o los datos son inválidos." });
    }
    setTimeout(() => setUserCreateMsg(null), 3000);
  };

  // ── Sidebar TABS ─────────────────────────────────────────────
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
  ];

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="admin-page">

      {/* ── Sidebar ─────────────────────────────────────── */}
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
                <span className="sidebar-item__badge">{tab.badge}</span>
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

      {/* ── Main ────────────────────────────────────────── */}
      <div className="admin-main">
        <h1>{activeTab}</h1>

        {/* ════════ DASHBOARD ════════ */}
        {activeTab === "Dashboard" && (
          <div className="dashboard">

            {/* Alert banner */}
            {(stats.productsOut > 0 || stats.lowStock > 0) && (
              <div className="alert-banner">
                <span>⚠ {stats.productsOut} agotados · {stats.lowStock} en stock crítico</span>
                <span
                  className="alert-banner__link"
                  onClick={() => { setActiveTab("Productos"); setCriticalFilter(true); }}
                >
                  Ver productos críticos →
                </span>
              </div>
            )}

            {/* Stat cards */}
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

            {/* Bottom row: chart + side panels */}
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
          <>
            <div className={`filters ${flashFilters ? "flash" : ""}`}>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {criticalFilter && (
                <button className="filter-active-badge" onClick={() => setCriticalFilter(false)}>
                  ⚠ Solo críticos ✕
                </button>
              )}
              <button
                className={`export-btn ${flashExcel ? "flash" : ""}`}
                onClick={exportToExcel}
                disabled={products.length === 0}
              >
                ↓ Exportar Excel (3 hojas)
              </button>
              <button
                className={`save-changes-btn ${hasUnsavedChanges ? "has-changes" : "no-changes"}`}
                onClick={saveChangesToExcel}
                title={lastSavedAt ? `Último guardado: ${lastSavedAt}` : "Sin guardado previo"}
              >
                {hasUnsavedChanges
                  ? `● Guardar cambios (${changeLog.length})`
                  : "✓ Todo guardado"}
              </button>
              <select
                value={marginFilter}
                onChange={(e) => setMarginFilter(e.target.value)}
                title="Filtrar por margen"
              >
                <option value="all">Todos los márgenes</option>
                <option value="low">Margen &lt; 20% (bajo)</option>
                <option value="mid">Margen 20–40% (medio)</option>
                <option value="good">Margen &gt; 40% (bueno)</option>
              </select>
              <button
                className="print-labels-btn"
                onClick={printLabels}
                disabled={products.length === 0}
              >
                ⎙ Imprimir etiquetas
              </button>
              <button className="btn-new-product" onClick={handleOpenDrawer}>
                + Nuevo producto
              </button>
            </div>

            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Imagen</th>
                    <th className="sortable" onClick={() => handleSort("name")}>
                      Nombre{getSortIcon("name")}
                    </th>
                    <th>Categoría</th>
                    <th className="sortable" onClick={() => handleSort("price")}>
                      Venta UYU{getSortIcon("price")}
                    </th>
                    <th>Costo UYU</th>
                    <th>Margen %</th>
                    <th>Estado</th>
                    <th className="sortable" onClick={() => handleSort("stock")}>
                      Stock{getSortIcon("stock")}
                    </th>
                    <th>Destacado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="table-empty-cell">
                        <div className="table-empty-state">
                          <span>No se encontraron productos</span>
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              setFilterCategory("Todas");
                              setCriticalFilter(false);
                            }}
                          >
                            Limpiar filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredProducts.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={flashRow === p.id ? "row-flash" : ""}
                        onClick={() => handleEditProduct(p)}
                      >
                        <td className="col-num">{idx + 1}</td>
                        <td className="col-img" onClick={(e) => e.stopPropagation()}>
                          {p.image
                            ? <img src={p.image} alt={p.name} className="product-thumb" onError={(e) => { e.target.style.display = "none"; }}/>
                            : <span className="no-img">—</span>
                          }
                        </td>
                        <td className="col-name">
                          <div className="p-name">
                            {p.name}
                            {p.isNew && <span className="badge-new">NUEVO</span>}
                          </div>
                          <div className="p-desc">{p.description}</div>
                        </td>
                        <td>{p.category || "—"}</td>
                        <td>{formatPrice(p.price)}</td>
                        <td>{p.precioCosto ? formatPrice(p.precioCosto) : <span className="badge-no-costo" title="Sin precio de costo — el margen de la IA será incorrecto">! Sin costo</span>}</td>
                        <td>
                          {p.precioCosto ? (() => {
                            const m = Math.round((1 - p.precioCosto / p.price) * 100);
                            const cls = m > 40 ? "margin-good" : m >= 20 ? "margin-mid" : "margin-bad";
                            return <span className={cls}>{m}%</span>;
                          })() : "—"}
                        </td>
                        <td className="col-status" onClick={(e) => e.stopPropagation()}>
                          <select
                            className={`status-badge status-badge--${p.status || "activo"}`}
                            value={p.status || "activo"}
                            onChange={(e) => updateProductStatus(p.id, e.target.value)}
                          >
                            <option value="activo">Activo</option>
                            <option value="borrador">Borrador</option>
                            <option value="descontinuado">Descontinuado</option>
                            <option value="oculto">Oculto</option>
                          </select>
                        </td>
                        <td
                          className="col-stock"
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingStock(p.id); }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {editingStock === p.id ? (
                            <input
                              type="number"
                              className="stock-inline-input"
                              defaultValue={p.stock}
                              autoFocus
                              min="0"
                              onBlur={(e) => {
                                updateProduct({ ...p, stock: Number(e.target.value) });
                                setEditingStock(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.target.blur();
                                if (e.key === "Escape") setEditingStock(null);
                              }}
                            />
                          ) : (
                            <span
                              className={`stock-badge ${stockBadgeClass(p.stock)}`}
                              title="Doble click para editar"
                            >
                              {p.stock}
                            </span>
                          )}
                        </td>
                        <td className="col-featured" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="featured-toggle"
                            checked={p.featured}
                            onChange={() => toggleFeatured(p.id)}
                          />
                        </td>
                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="tbl-btn edit" onClick={() => handleEditProduct(p)}>Editar</button>
                          <button className="tbl-btn delete" onClick={() => setDeleteConfirm(p)}>Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ════════ STOCK ════════ */}
        {activeTab === "Stock" && <Stock />}

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
                  <input name="email" value={newUserForm.email} onChange={handleNewUserChange} placeholder="Email" required />
                </div>
                <div className="form-row">
                  <input
                    type="password"
                    name="password"
                    value={newUserForm.password}
                    onChange={handleNewUserChange}
                    placeholder="Contraseña temporal"
                    required
                  />
                  <select name="cloneFromEmail" value={newUserForm.cloneFromEmail} onChange={handleNewUserChange}>
                    <option value="">Clonar permisos desde…</option>
                    {(users || []).filter((u) => u.role === "Administrador").map((u) => (
                      <option key={u.email} value={u.email}>{u.name} (Admin)</option>
                    ))}
                  </select>
                </div>
                <button className="primary-btn">Crear empleado</button>
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
                          <span className={`role-badge ${u.role === "Administrador" ? "admin" : "employee"}`}>
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
                  <h4>Historial de acciones</h4>
                  <p className="empty-state">Sin acciones registradas</p>
                  <button className="primary-btn" onClick={() => setSelectedUser(null)}>Cerrar</button>
                </div>
              </div>
            )}

            {permissionsUser && (
              <div className="modal-overlay" onClick={() => setPermissionsUser(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h2>Permisos de {permissionsUser.name}</h2>
                  {["Productos", "Stock", "Usuarios"].map((perm) => (
                    <label key={perm} className="checkbox">
                      <input type="checkbox" onChange={() => togglePermission(permissionsUser.id, perm)} />
                      {perm}
                    </label>
                  ))}
                  <button className="primary-btn" onClick={() => setPermissionsUser(null)}>Guardar</button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>{/* /admin-main */}

      {/* ── Drawer overlay ──────────────────────────────── */}
      {drawerOpen && <div className="drawer-overlay" onClick={handleCloseDrawer} />}

      {/* ── Product drawer ──────────────────────────────── */}
      <div className={`product-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h3>{editingProduct ? `Editar: ${editingProduct.name}` : "Nuevo producto"}</h3>
          <button className="drawer-close" onClick={handleCloseDrawer}>✕</button>
        </div>
        <div className="drawer-body">
          <form id="drawer-form" onSubmit={handleAddOrUpdateProduct}>

            <div className="drawer-field">
              <label>Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre del producto" required />
            </div>

            <div className="drawer-field">
              <label>Precio venta (UYU) *</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="0" required min="0" />
            </div>

            <div className="drawer-field">
              <label>Precio costo (UYU)</label>
              <input type="number" name="precioCosto" value={form.precioCosto} onChange={handleChange} placeholder="0" min="0" />
            </div>

            <div className="drawer-field">
              <label>Categoría</label>
              <select
                value={showNewCat ? "__new__" : form.category}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__new__") {
                    setShowNewCat(true);
                    setForm((prev) => ({ ...prev, category: "" }));
                  } else {
                    setShowNewCat(false);
                    setForm((prev) => ({ ...prev, category: val }));
                  }
                }}
              >
                <option value="">Sin categoría</option>
                {[...new Set(products.map((p) => p.category).filter(Boolean))].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__">+ Nueva categoría</option>
              </select>
              {showNewCat && (
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Nombre de la nueva categoría"
                  autoFocus
                />
              )}
            </div>

            <div className="drawer-field">
              <label>Descripción</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Descripción del producto" />
            </div>

            <div className="drawer-field">
              <label>Stock *</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" placeholder="0" />
            </div>

            <div className="drawer-field">
              <label>Imagen</label>
              <div className="image-mode-tabs">
                <button
                  type="button"
                  className={`img-tab ${imageMode === "url" ? "active" : ""}`}
                  onClick={() => setImageMode("url")}
                >URL</button>
                <button
                  type="button"
                  className={`img-tab ${imageMode === "file" ? "active" : ""}`}
                  onClick={() => setImageMode("file")}
                >Subir archivo</button>
              </div>
              {imageMode === "url"
                ? <input name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
                : <input type="file" accept="image/*" onChange={handleFileImage} />
              }
              {(imagePreview || form.image) && (
                <img src={imagePreview || form.image} alt="preview" className="img-preview" />
              )}
            </div>

          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-cancel" onClick={handleCloseDrawer}>Cancelar</button>
          <button type="submit" form="drawer-form" className="btn-save">
            {editingProduct ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ── Modal eliminar producto ──────────────────────── */}
      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__icon">⚠</div>
            <h3>Eliminar producto</h3>
            <p>¿Estás seguro que querés eliminar <strong>"{deleteConfirm.name}"</strong>?</p>
            <p className="confirm-modal__sub">Esta acción no se puede deshacer.</p>
            <div className="confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn-delete"
                onClick={() => { removeProductAndFlag(deleteConfirm.id); setDeleteConfirm(null); }}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal desactivar usuario ─────────────────────── */}
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
  );
};

export default Admin;
