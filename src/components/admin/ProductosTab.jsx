import { useState, useMemo, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function ProductosTab({
  products,
  orders,
  addProduct,
  removeProduct,
  toggleFeatured,
  updateProduct,
  markProductsExported,
  changeLog,
  hasUnsavedChanges,
  lastSavedAt,
  clearChangeLog,
  updateProductStatus,
}) {
  const [form, setForm] = useState({ name: "", price: "", precioCosto: "", image: "", category: "", description: "", stock: 0 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageMode, setImageMode] = useState("url");
  const [imagePreview, setImagePreview] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [flashRow, setFlashRow] = useState(null);

  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [criticalFilter, setCriticalFilter] = useState(false);
  const [marginFilter, setMarginFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [flashExcel, setFlashExcel] = useState(false);
  const [flashFilters, setFlashFilters] = useState(false);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [editingStock, setEditingStock] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [manualOrder, setManualOrder] = useState(null);

  const [showHistory, setShowHistory] = useState(false);

  const [hoveredImgId, setHoveredImgId] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [viewMode, setViewMode] = useState("table");

  const [editingCell, setEditingCell] = useState(null);

  const [noImageFilter, setNoImageFilter] = useState(false);

  // debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const soldCounts = useMemo(() => {
    const map = {};
    (orders || []).forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = String(item.id);
        map[key] = (map[key] || 0) + (item.quantity || 1);
      });
    });
    return map;
  }, [orders]);

  const effectivePrice = (p) => {
    if (p?.descuento?.porcentaje && p?.descuento?.hasta) {
      if (new Date(p.descuento.hasta) > new Date())
        return p.price * (1 - p.descuento.porcentaje / 100);
    }
    return p.price;
  };

  const hasActiveFilters = debouncedSearch || filterCategory !== "Todas" || criticalFilter || marginFilter !== "all" || noImageFilter || sortColumn;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = filterCategory === "Todas" || p.category === filterCategory;
      const matchesNoImage = !noImageFilter || !p.image;
      let matchesMargin = true;
      if (marginFilter !== "all" && p.precioCosto && p.price) {
        const margin = Math.round((1 - p.precioCosto / p.price) * 100);
        if (marginFilter === "low")  matchesMargin = margin < 20;
        if (marginFilter === "mid")  matchesMargin = margin >= 20 && margin <= 40;
        if (marginFilter === "good") matchesMargin = margin > 40;
      }
      return matchesSearch && matchesCategory && matchesMargin && matchesNoImage;
    });
  }, [products, debouncedSearch, filterCategory, marginFilter, noImageFilter]);

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

  const formatPrice = (price) => "$" + Math.round(price).toLocaleString("es-UY");

  const allSelected =
    sortedFilteredProducts.length > 0 &&
    sortedFilteredProducts.every((p) => selectedIds.has(p.id));

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    allSelected
      ? setSelectedIds(new Set())
      : setSelectedIds(new Set(sortedFilteredProducts.map((p) => p.id)));

  const bulkActivate = () => {
    selectedIds.forEach((id) => updateProductStatus(id, "activo"));
    setSelectedIds(new Set());
  };
  const bulkDeactivate = () => {
    selectedIds.forEach((id) => updateProductStatus(id, "borrador"));
    setSelectedIds(new Set());
  };
  const bulkDelete = () => setDeleteConfirm({ bulk: true, ids: [...selectedIds] });

  const displayedProducts = useMemo(() => {
    if (!manualOrder || sortColumn) return sortedFilteredProducts;
    const orderMap = new Map(manualOrder.map((id, i) => [id, i]));
    return [...sortedFilteredProducts].sort(
      (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
    );
  }, [manualOrder, sortedFilteredProducts, sortColumn]);

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ids = displayedProducts.map((p) => p.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx   = ids.indexOf(targetId);
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragId);
    setManualOrder(next);
    setDragId(null);
    setDragOverId(null);
  };

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

  const triggerFlash = () => {
    setFlashExcel(true);
    setFlashFilters(true);
    setTimeout(() => { setFlashExcel(false); setFlashFilters(false); }, 600);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Solo se permiten imágenes (jpg, png, webp)"); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadError("La imagen no puede superar 5 MB"); return; }
    setUploadError("");
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image: base64 }));
      setUploadLoading(false);
    };
    reader.onerror = () => {
      setUploadError("Error al leer el archivo");
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
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

  const duplicateProduct = (p) => {
    addProduct({
      name: `${p.name} (copia)`,
      price: p.price,
      precioCosto: p.precioCosto || "",
      image: p.image || "",
      category: p.category || "",
      description: p.description || "",
      stock: 0,
    });
    triggerFlash();
  };

  const exportToExcel = (onlySelected = false) => {
    const source = onlySelected && selectedIds.size > 0
      ? products.filter(p => selectedIds.has(p.id))
      : products;
    if (source.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const workbook = XLSX.utils.book_new();

    const allData = source.map((p) => ({
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

    const criticalData = source
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

    const catMap = {};
    source.forEach((p) => {
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

    const rentabilidadData = source.map((p) => {
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

    const ivaData = source.map((p) => {
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

    const inventarioData = source.map((p) => ({
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

  const saveChangesToExcel = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const workbook = XLSX.utils.book_new();

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

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const printLabels = () => {
    const win = window.open("", "_blank");
    const source =
      selectedIds.size > 0
        ? products.filter((p) => selectedIds.has(p.id))
        : hasActiveFilters
        ? sortedFilteredProducts
        : products;
    const rows = source.map((p) => `
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
      <script>window.onload = () => window.print();</script>
    </body></html>`);
    win.document.close();
  };

  return (
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
          className={`btn-critical-filter ${noImageFilter ? "active" : ""}`}
          onClick={() => setNoImageFilter(v => !v)}
          title="Mostrar productos sin imagen"
        >
          📷 Sin imagen{noImageFilter && " ✕"}
        </button>
        <button
          className={`btn-critical-filter ${criticalFilter ? "active" : ""}`}
          onClick={() => setCriticalFilter((v) => !v)}
          title="Mostrar solo productos con stock ≤ 5"
        >
          ⚠ Stock crítico{criticalFilter && " ✕"}
        </button>
        <button
          className={`export-btn ${flashExcel ? "flash" : ""}`}
          onClick={() => exportToExcel(false)}
          disabled={products.length === 0}
          title="Exportar todos"
        >
          ↓ Exportar Excel
        </button>
        {selectedIds.size > 0 && (
          <button
            className="export-btn export-btn--selected"
            onClick={() => exportToExcel(true)}
            title={`Exportar solo los ${selectedIds.size} seleccionados`}
          >
            ↓ Exportar ({selectedIds.size})
          </button>
        )}
        <button
          className={`save-changes-btn ${hasUnsavedChanges ? "has-changes" : "no-changes"}`}
          onClick={saveChangesToExcel}
          title={lastSavedAt ? `Último guardado: ${lastSavedAt}` : "Sin guardado previo"}
        >
          {hasUnsavedChanges ? `● Guardar (${changeLog.length})` : "✓ Guardado"}
        </button>
        <button className="print-labels-btn" onClick={printLabels} disabled={products.length === 0}>
          ⎙ Etiquetas
        </button>
        <button
          className={`btn-view-toggle ${viewMode === "grid" ? "active" : ""}`}
          onClick={() => setViewMode(v => v === "table" ? "grid" : "table")}
          title={viewMode === "table" ? "Ver como grilla" : "Ver como tabla"}
        >
          {viewMode === "table" ? "⊞ Grilla" : "☰ Tabla"}
        </button>
        <button className="btn-new-product" onClick={handleOpenDrawer}>
          + Nuevo producto
        </button>
      </div>

      <div className="table-meta-bar">
        <span className="results-counter">
          Mostrando <strong>{displayedProducts.length}</strong> de{" "}
          <strong>{products.length}</strong> productos
          {(criticalFilter || filterCategory !== "Todas" || debouncedSearch) && " · filtro activo"}
        </span>
        {selectedIds.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar__count">{selectedIds.size} seleccionados</span>
            <button className="bulk-btn bulk-btn--activate" onClick={bulkActivate}>Activar</button>
            <button className="bulk-btn bulk-btn--draft"    onClick={bulkDeactivate}>Borrador</button>
            <button className="bulk-btn bulk-btn--delete"   onClick={bulkDelete}>Eliminar</button>
            <button className="bulk-btn bulk-btn--clear"    onClick={() => setSelectedIds(new Set())}>✕ Limpiar</button>
          </div>
        )}
      </div>

      <div className="history-panel">
        <button
          className={`history-toggle ${showHistory ? "open" : ""}`}
          onClick={() => setShowHistory((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Historial de cambios ({changeLog.length})
          <span className={`history-chevron ${showHistory ? "open" : ""}`}>▾</span>
        </button>
        {showHistory && (
          <div className="history-list">
            {changeLog.length === 0
              ? <p className="history-empty">Sin cambios registrados en esta sesión.</p>
              : [...changeLog].reverse().map((c, i) => (
                  <div key={i} className={`history-entry history-entry--${c.tipo}`}>
                    <span className="history-entry__tipo">{c.tipo}</span>
                    <span className="history-entry__nombre">{c.nombre}</span>
                    <span className="history-entry__detalle">{c.detalle}</span>
                    <span className="history-entry__time">{c.timestamp}</span>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {viewMode === "grid" && (
        <div className="products-grid-view">
          {displayedProducts.length === 0 ? (
            <div className="table-empty-state">
              <span>No se encontraron productos</span>
              <button onClick={() => { setSearchTerm(""); setFilterCategory("Todas"); setCriticalFilter(false); setNoImageFilter(false); }}>Limpiar filtros</button>
            </div>
          ) : displayedProducts.map((p) => {
            const ep = effectivePrice(p);
            const hasDiscount = ep < p.price;
            return (
              <div
                key={p.id}
                className={`product-grid-card${!p.image ? " product-grid-card--no-img" : ""}`}
                onClick={() => handleEditProduct(p)}
              >
                <div className="product-grid-card__img-wrap">
                  {p.image
                    ? <img src={p.image} alt={p.name} onError={(e) => { e.target.style.display = "none"; }} />
                    : <span className="product-grid-card__no-img">⚠ Sin imagen</span>
                  }
                  <span className={`stock-badge stock-badge--overlay ${stockBadgeClass(p.stock)}`}>{p.stock}</span>
                </div>
                <div className="product-grid-card__body">
                  <p className="product-grid-card__name">{p.name}</p>
                  <p className="product-grid-card__cat">{p.category || "—"}</p>
                  <div className="product-grid-card__price">
                    {hasDiscount
                      ? <><span className="price-original">{formatPrice(p.price)}</span><span className="price-discounted">{formatPrice(ep)}</span></>
                      : formatPrice(p.price)
                    }
                  </div>
                  <div className="product-grid-card__actions" onClick={(e) => e.stopPropagation()}>
                    <button className="tbl-btn edit" onClick={() => handleEditProduct(p)}>Editar</button>
                    <button className="tbl-btn duplicate" onClick={() => duplicateProduct(p)} title="Duplicar">⧉</button>
                    <button className="tbl-btn delete" onClick={() => setDeleteConfirm(p)}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "table" && (
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th className="col-drag" title={hasActiveFilters ? "Desactivá filtros para reordenar" : "Arrastrar para reordenar"}>⠿</th>
                <th className="col-check">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Seleccionar todos" />
                </th>
                <th>#</th>
                <th>Imagen</th>
                <th className="sortable" onClick={() => handleSort("name")}>Nombre{getSortIcon("name")}</th>
                <th className="sortable" onClick={() => handleSort("category")}>Categoría{getSortIcon("category")}</th>
                <th className="sortable" onClick={() => handleSort("price")}>Precio{getSortIcon("price")}</th>
                <th>Margen %</th>
                <th>Estado</th>
                <th className="sortable" onClick={() => handleSort("stock")}>Stock{getSortIcon("stock")}</th>
                <th>Vendidos</th>
                <th>Destacado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan="12" className="table-empty-cell">
                    <div className="table-empty-state">
                      <span>No se encontraron productos</span>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setFilterCategory("Todas");
                          setCriticalFilter(false);
                          setNoImageFilter(false);
                        }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={[
                      flashRow === p.id   ? "row-flash"    : "",
                      dragOverId === p.id ? "row-drag-over": "",
                      selectedIds.has(p.id) ? "row-selected": "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleEditProduct(p)}
                    draggable={!hasActiveFilters}
                    onDragStart={() => !hasActiveFilters && handleDragStart(p.id)}
                    onDragOver={(e) => handleDragOver(e, p.id)}
                    onDrop={() => handleDrop(p.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  >
                    <td className="col-drag" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`drag-handle${hasActiveFilters ? " drag-handle--disabled" : ""}`}
                        title={hasActiveFilters ? "Desactivá los filtros para reordenar" : "Arrastrar para reordenar"}
                      >⠿</span>
                    </td>

                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>

                    <td className="col-num">{idx + 1}</td>

                    <td className={`col-img${!p.image ? " col-img--missing" : ""}`} onClick={(e) => e.stopPropagation()}>
                      <div
                        className="thumb-wrap"
                        onMouseEnter={() => setHoveredImgId(p.id)}
                        onMouseLeave={() => setHoveredImgId(null)}
                        title={!p.image ? "Sin imagen — no se muestra en tienda" : ""}
                      >
                        {p.image
                          ? <img src={p.image} alt={p.name} className="product-thumb" onError={(e) => { e.target.style.display = "none"; }}/>
                          : <span className="no-img" title="Sin imagen">⚠</span>
                        }
                        {hoveredImgId === p.id && p.image && (
                          <div className="img-preview-tooltip">
                            <img src={p.image} alt={p.name} />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="col-name" onDoubleClick={(e) => { e.stopPropagation(); setEditingCell({ id: p.id, field: "name" }); }} onClick={(e) => e.stopPropagation()}>
                      {editingCell?.id === p.id && editingCell?.field === "name" ? (
                        <input
                          className="inline-edit-input"
                          defaultValue={p.name}
                          autoFocus
                          onBlur={(e) => { updateProduct({ ...p, name: e.target.value }); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingCell(null); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="p-name">
                            {p.name}
                            {p.isNew && <span className="badge-new">NUEVO</span>}
                          </div>
                          <div className="p-desc">{p.description}</div>
                        </>
                      )}
                    </td>

                    <td>{p.category || "—"}</td>

                    <td className="col-price" onDoubleClick={(e) => { e.stopPropagation(); setEditingCell({ id: p.id, field: "price" }); }} onClick={(e) => e.stopPropagation()}>
                      {editingCell?.id === p.id && editingCell?.field === "price" ? (
                        <input
                          className="inline-edit-input inline-edit-input--price"
                          type="number"
                          defaultValue={p.price}
                          autoFocus
                          onBlur={(e) => { updateProduct({ ...p, price: Number(e.target.value) }); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingCell(null); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (() => {
                        const ep = effectivePrice(p);
                        const hasDiscount = ep < p.price;
                        return hasDiscount ? (
                          <span className="price-with-discount">
                            <span className="price-original">{formatPrice(p.price)}</span>
                            <span className="price-discounted">{formatPrice(ep)}</span>
                          </span>
                        ) : formatPrice(p.price);
                      })()}
                    </td>

                    <td>
                      {p.precioCosto ? (() => {
                        const m = Math.round((1 - p.precioCosto / p.price) * 100);
                        const cls = m > 40 ? "margin-good" : m >= 20 ? "margin-mid" : "margin-bad";
                        return (
                          <span className={`margin-badge ${cls}`} title={`Costo: ${formatPrice(p.precioCosto)}`}>
                            {m}%
                          </span>
                        );
                      })() : <span className="badge-no-costo" title="Sin precio de costo">! s/c</span>}
                    </td>

                    <td className="col-status" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`status-toggle ${(p.status || "activo") === "activo" ? "status-toggle--on" : "status-toggle--off"}`}
                        onClick={() => updateProductStatus(p.id, (p.status || "activo") === "activo" ? "borrador" : "activo")}
                        title={p.status || "activo"}
                      >
                        <span className="status-toggle__knob" />
                        <span className="status-toggle__label">
                          {(p.status || "activo") === "activo" ? "Activo" : p.status}
                        </span>
                      </button>
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

                    <td className="col-sold">
                      <span className="sold-badge">
                        {soldCounts[String(p.id)] || 0}
                      </span>
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
                      <button className="tbl-btn duplicate" onClick={() => duplicateProduct(p)} title="Duplicar producto">⧉</button>
                      <button className="tbl-btn delete" onClick={() => setDeleteConfirm(p)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && <div className="drawer-overlay" onClick={handleCloseDrawer} />}

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

            {editingProduct && Array.isArray(editingProduct.priceHistory) && editingProduct.priceHistory.length > 1 && (
              <div className="drawer-field drawer-price-history">
                <label>Historial de precios</label>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={editingProduct.priceHistory} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="fecha" tick={{ fill: "#99907c", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#99907c", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "4px", fontSize: "11px" }}
                      labelStyle={{ color: "#D4AF37" }}
                      itemStyle={{ color: "#e5e2e1" }}
                      formatter={(v) => [`$${v}`, "Precio"]}
                    />
                    <Line type="monotone" dataKey="precio" stroke="#D4AF37" strokeWidth={1.5} dot={{ r: 3, fill: "#D4AF37" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

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
                : (
                  <div
                    className={`upload-zone ${uploadDragOver ? "upload-zone--dragover" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
                    onDragLeave={() => setUploadDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setUploadDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileImage(f); }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileImage(e.target.files[0])}
                    />
                    {uploadLoading
                      ? <span className="upload-progress">Subiendo…</span>
                      : <span className="upload-zone__text">Arrastrá una imagen o hacé click para seleccionar<br/><small>JPG, PNG, WEBP · máx 5 MB</small></span>
                    }
                  </div>
                )
              }
              {uploadError && <p className="upload-error">{uploadError}</p>}
              {(imagePreview || form.image) && (
                <img src={imagePreview || form.image} alt="preview" className="img-preview" />
              )}
            </div>

          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-cancel" onClick={handleCloseDrawer}>Cancelar</button>
          <button type="submit" form="drawer-form" className="btn-save" disabled={uploadLoading}>
            {uploadLoading ? "Subiendo imagen…" : editingProduct ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__icon">⚠</div>
            <h3>Eliminar {deleteConfirm.bulk ? `${deleteConfirm.ids.length} productos` : "producto"}</h3>
            {deleteConfirm.bulk
              ? <p>¿Eliminar definitivamente <strong>{deleteConfirm.ids.length} productos seleccionados</strong>?</p>
              : <p>¿Estás seguro que querés eliminar <strong>"{deleteConfirm.name}"</strong>?</p>
            }
            <p className="confirm-modal__sub">Esta acción no se puede deshacer.</p>
            <div className="confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn-delete"
                onClick={() => {
                  if (deleteConfirm.bulk) {
                    deleteConfirm.ids.forEach((id) => removeProduct(id));
                    setSelectedIds(new Set());
                    triggerFlash();
                  } else {
                    removeProductAndFlag(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
