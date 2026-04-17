import { useState, useContext, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import { AuthContext } from "./AuthContext";
import { OrdersContext } from "./OrdersContext";
import "../styles/Admin.scss";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import Stock from "./Stock";
import "../styles/Stock.scss";
import { useReviews } from "./ReviewsContext";
import { useToast } from "./ToastContext";
import { fmtDateTime } from "../lib/adminUtils";
import ShippingLabelModal from "./ShippingLabelModal";
import ShippingNotifyModal from "./ShippingNotifyModal";

// Formatea número uruguayo para wa.me (agrega 598 si falta)
function toWaNumber(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.startsWith("598") ? d : `598${d.replace(/^0/, "")}`;
}

const Admin = () => {
  const {
    products, addProduct, removeProduct, toggleFeatured,
    updateProduct, markProductsExported,
    changeLog, hasUnsavedChanges, lastSavedAt, clearChangeLog,
    updateProductStatus,
  } = useContext(ProductsContext);
  const { users, createUser, toggleUserStatus, togglePermission } = useContext(AuthContext);
  const { reviews, addReview, deleteReview, toggleApproved } = useReviews();
  const { orders, getAllOrders, updateOrderStatus, updateOrderFields, createOrder, deleteOrder } = useContext(OrdersContext);

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

  // ── Upload imagen ─────────────────────────────────────────────
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

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

  // ── Bulk selection ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Drag & drop reorder ───────────────────────────────────────
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [manualOrder, setManualOrder] = useState(null);

  // ── Historial panel ───────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);

  // ── Image tooltip hover ───────────────────────────────────────
  const [hoveredImgId, setHoveredImgId] = useState(null);

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

  const { toast } = useToast();

  // ── Ventas ───────────────────────────────────────────────────
  const [salesSearch, setSalesSearch]           = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("todas");
  const [salesDateFilter, setSalesDateFilter]   = useState("30d");
  const [expandedOrderId, setExpandedOrderId]   = useState(null);
  const [shippingLabelOrder, setShippingLabelOrder]   = useState(null);
  const [shippingNotifyOrder, setShippingNotifyOrder] = useState(null); // modal notificación enviado
  const [salesPage, setSalesPage] = useState(1);
  const [statusConfirm, setStatusConfirm] = useState(null);

  // ── Registrar venta rápida ────────────────────────────────────
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

  const selectedQuickProduct = products.find((p) => String(p.id) === String(quickSaleProd));
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
    const oldStock = product.stock;
    const newStock = product.stock - quickSaleQty;

    // #9 — Deduct stock
    await updateProduct({ ...product, stock: newStock });

    // Create order so it appears in the Ventas orders list
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

    // Log entry for session history
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

    // Success flash
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

  // ── Vista tabla/grilla (#1) ──────────────────────────────────
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

  // ── Edición inline nombre/precio (#2) ────────────────────────
  const [editingCell, setEditingCell] = useState(null); // { id, field }

  // ── Filtro sin imagen (#6) ───────────────────────────────────
  const [noImageFilter, setNoImageFilter] = useState(false);

  // ── Reseñas ──────────────────────────────────────────────────
  const [reviewFilter, setReviewFilter] = useState("all"); // all | pending | approved
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 5, comment: "", product_name: "" });
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewFormSent, setReviewFormSent] = useState(false);

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

  // ── Ventas: recargar órdenes cada vez que se entra al tab ────
  useEffect(() => {
    if (activeTab === "Ventas") {
      getAllOrders();
    }
  }, [activeTab, getAllOrders]);

  // ── Auto-entregado: si pasaron 24hs desde shipped_at sin reclamo ──
  useEffect(() => {
    if (activeTab !== "Ventas" || orders.length === 0) return;
    const now = Date.now();
    orders.forEach(o => {
      if (o.status === "enviado" && o.shipped_at) {
        const elapsed = now - new Date(o.shipped_at).getTime();
        if (elapsed >= 24 * 60 * 60 * 1000) {
          updateOrderStatus(o.id, "entregado");
        }
      }
    });
  }, [orders, activeTab, updateOrderStatus]);

  // ── Ventas: computed ──────────────────────────────────────────
  const salesDateCutoff = useMemo(() => {
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

  const ORDERS_PER_PAGE = 15;
  const pagedOrders = filteredOrders.slice((salesPage - 1) * ORDERS_PER_PAGE, salesPage * ORDERS_PER_PAGE);

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
      const d   = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), total: map[key] || 0 });
    }
    return days;
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
      ID: (o.id || "").toString().slice(0, 8),
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

  // #7 — Unidades vendidas por producto (desde órdenes)
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

  // #5 — Precio efectivo con descuento
  const effectivePrice = (p) => {
    if (p?.descuento?.porcentaje && p?.descuento?.hasta) {
      if (new Date(p.descuento.hasta) > new Date())
        return p.price * (1 - p.descuento.porcentaje / 100);
    }
    return p.price;
  };

  // #9 — ¿Hay filtros activos?
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

  // ── Helpers ──────────────────────────────────────────────────
  const formatPrice = (price) => "$" + Math.round(price).toLocaleString("es-UY");

  // ── Bulk selection helpers ────────────────────────────────────
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

  // ── Drag & drop helpers ───────────────────────────────────────
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

  const handleFileImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Solo se permiten imágenes (jpg, png, webp)"); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadError("La imagen no puede superar 5 MB"); return; }
    setUploadError("");
    setUploadLoading(true);

    // Convertir a base64 — se guarda directo en la columna `image` de Supabase
    // No requiere bucket ni políticas de Storage
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

  // #3 — Duplicar producto
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

  // ── Export Excel (#10 — soporta exportar solo seleccionados) ──
  const exportToExcel = (onlySelected = false) => {
    const source = onlySelected && selectedIds.size > 0
      ? products.filter(p => selectedIds.has(p.id))
      : products;
    if (source.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Inventario completo
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

    // Hoja 2: Stock crítico
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

    // Hoja 3: Resumen por categoría
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

    // Hoja 4: Rentabilidad
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

    // Hoja 5: IVA Uruguay (22%)
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

    // Hoja 6: Valor de inventario
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
    {
      id: "Ventas", label: "Ventas",
      badge: salesKPIs?.pending || null,
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
  ];

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
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
              {/* #6 — Filtro sin imagen */}
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
              {/* #10 — Exportar seleccionados */}
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
              {/* #1 — Toggle vista tabla/grilla */}
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

            {/* ── Contador + bulk bar ─────────────────────────── */}
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

            {/* ── Historial de cambios ─────────────────────────── */}
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

            {/* #1 — Vista grilla */}
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
                    {/* #9 — handle desactivado cuando hay filtros */}
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
                        {/* #9 — Drag handle desactivado si hay filtros */}
                        <td className="col-drag" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`drag-handle${hasActiveFilters ? " drag-handle--disabled" : ""}`}
                            title={hasActiveFilters ? "Desactivá los filtros para reordenar" : "Arrastrar para reordenar"}
                          >⠿</span>
                        </td>

                        {/* Checkbox */}
                        <td className="col-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>

                        <td className="col-num">{idx + 1}</td>

                        {/* #4 — Imagen con aviso si falta */}
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

                        {/* #2 — Edición inline del nombre (doble click) */}
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

                        {/* #5 + #2 — Precio con descuento + edición inline */}
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

                        {/* Margen con color coding */}
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

                        {/* Estado — toggle activo/inactivo */}
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

                        {/* #7 — Unidades vendidas */}
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
                          {/* #3 — Duplicar producto */}
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
          </>
        )}

        {/* ════════ STOCK ════════ */}
        {activeTab === "Stock" && (
          <Stock
            onEditProduct={(product) => {
              setEditingProduct(product);
              setDrawerOpen(true);
              setActiveTab("Productos");
            }}
          />
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
        {/* ════════ VENTAS ════════ */}
        {activeTab === "Ventas" && (
          <div className="ventas-tab">

            {/* #3 — KPI Cards */}
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

            {/* #4 — Gráfico ventas por día */}
            <div className="ventas-chart-card">
              <h3 className="ventas-section-title">Ventas últimos 30 días (UYU)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={salesChartData}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} width={50} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [`$${v.toLocaleString("es-UY")}`, "Total"]} contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(212,175,55,0.2)", fontSize: 11 }} />
                  <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>


            {/* ── Registrar venta rápida ── */}
            <div className={`ventas-quick-sale-card${quickSaleSuccess ? " ventas-quick-sale-card--success" : ""}`}>
              <h3 className="ventas-section-title">Registrar venta</h3>

              {/* #8 — Success flash overlay */}
              {quickSaleSuccess ? (
                <div className="vqs__success">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>Venta registrada correctamente</span>
                </div>
              ) : (
                <form className="vqs" onSubmit={handleQuickSale}>

                  {/* Row 1: product selector + thumbnail preview (#1) */}
                  <div className="vqs__row">
                    {/* #1 — Thumbnail preview */}
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
                      <select
                        className="vqs__select"
                        value={quickSaleProd}
                        onChange={(e) => { setQuickSaleProd(e.target.value); setQuickSaleError(""); }}
                      >
                        <option value="">Seleccionar producto...</option>
                        {products
                          .filter((p) => !p.status || p.status === "activo")
                          .map((p) => (
                            <option key={p.id} value={p.id} disabled={p.stock === 0}>
                              {p.name}{p.stock === 0 ? " — Agotado" : ` (${p.stock} uds)`}
                            </option>
                          ))
                        }
                      </select>
                      {/* Stock availability badge */}
                      {selectedQuickProduct && (
                        <span className={`vqs__avail${selectedQuickProduct.stock <= 5 ? " vqs__avail--low" : ""}`}>
                          {selectedQuickProduct.stock === 0
                            ? "Sin stock"
                            : `${selectedQuickProduct.stock} disponibles · $${(selectedQuickProduct.price || 0).toLocaleString("es-UY")} c/u`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: stepper + customer name */}
                  <div className="vqs__row vqs__row--fields">

                    {/* Cantidad — stepper */}
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

                    {/* Nombre */}
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

                  {/* Row 3: email + phone */}
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

                  {/* #4 — Payment method pills */}
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

                  {/* Envío */}
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

                  {/* Summary row */}
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

                  {/* #7 — Submit (also handles Enter via form submit) */}
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

              {/* #10 — Session sales log */}
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

            {/* #6 — Filtros */}
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
              {/* #8 — Exportar */}
              <button className="ventas-export-btn" onClick={exportSalesToExcel} disabled={!orders || orders.length === 0}>
                ↓ Exportar Excel
              </button>
              <span className="ventas-count">{filteredOrders.length} orden{filteredOrders.length !== 1 ? "es" : ""}</span>
            </div>

            {/* ── Lista de ventas ── */}
            <div className="vl">
              {/* Table header */}
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
                // "pendiente" era el estado viejo — se trata como confirmado
                const normalizedStatus = o.status === "pendiente" ? "confirmado" : o.status;
                const statusInfo = statusMap[normalizedStatus] || statusMap.confirmado;
                const firstItem  = (o.items || [])[0];
                const itemCount  = (o.items || []).length;
                const isAdmin    = o.source === "admin";

                return (
                  <div key={o.id} className={`vl__row${isExpanded ? " vl__row--open" : ""}`}>

                    {/* ── Collapsed row ─────────────────────────── */}
                    <div className="vl__cols" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>

                      {/* Producto(s) */}
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
                          <span className="vl__order-id">#{(o.id || "").toString().slice(0, 8).toUpperCase()}</span>
                          {isAdmin && <span className="vl__source-badge">Venta directa</span>}
                        </div>
                      </div>

                      {/* Cliente */}
                      <div className="vl__col vl__col--client">
                        <span className="vl__client-name">{o.user_name || "—"}</span>
                      </div>

                      {/* Contacto */}
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

                      {/* Pago */}
                      <div className="vl__col">
                        <span className="vl__method">{o.payment_method || "—"}</span>
                      </div>

                      {/* Cupón */}
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

                      {/* Costo de envío */}
                      <div className="vl__col">
                        {o.shipping == null
                          ? <span className="vl__ship-cost vl__ship-cost--none">—</span>
                          : o.free_shipping || o.shipping === 0
                            ? <span className="vl__ship-cost vl__ship-cost--free">Gratis</span>
                            : <span className="vl__ship-cost vl__ship-cost--paid">${(o.shipping).toLocaleString("es-UY")}</span>
                        }
                      </div>

                      {/* Total */}
                      <div className="vl__col vl__col--total">
                        <span className="vl__total">${(o.total || 0).toLocaleString("es-UY")}</span>
                        {o.discount > 0 && (
                          <span className="vl__discount">−${o.discount.toLocaleString("es-UY")}</span>
                        )}
                      </div>

                      {/* Estado */}
                      <div className="vl__col" onClick={e => e.stopPropagation()}>
                        <select
                          className={`ventas-status-select ${statusInfo.cls}`}
                          value={normalizedStatus || "confirmado"}
                          onChange={e => {
                            const next = e.target.value;
                            if (next === "entregado" || next === "reclamo") {
                              setStatusConfirm({ id: o.id, next, label: next === "entregado" ? "Entregado" : "Reclamo" });
                              return; // don't update yet
                            }
                            if (next === "enviado") {
                              updateOrderFields(o.id, { status: next, shipped_at: new Date().toISOString() });
                              // Abrir modal para completar agencia/detalles antes de enviar WA
                              setShippingNotifyOrder(o);
                            } else {
                              updateOrderStatus(o.id, next);
                            }
                            if (next === "armando") {
                              // Construir mensaje WhatsApp para pasar al modal
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
                              // Mostrar boleta — el botón de WA está dentro del modal
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

                      {/* Fecha */}
                      <div className="vl__col vl__col--date">
                        {o.created_at
                          ? <>
                              <span>{new Date(o.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "short" })}</span>
                              <span className="vl__time">{new Date(o.created_at).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}</span>
                            </>
                          : "—"
                        }
                      </div>

                      {/* Acciones */}
                      <div className="vl__col vl__col--actions" onClick={e => e.stopPropagation()}>
                        {/* Botón confirmación — solo en pedidos nuevos sin confirmar */}
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
                          onClick={() => {
                            if (window.confirm(`¿Eliminar el pedido #${(o.id || "").toString().slice(0, 8).toUpperCase()}? Esta acción no se puede deshacer.`)) {
                              deleteOrder(o.id);
                            }
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* ── Expanded detail ───────────────────────── */}
                    {isExpanded && (
                      <div className="vl__detail">

                        {/* Col 1: Cliente */}
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

                        {/* Col 2: Envío */}
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

                        {/* Col 3: Pago */}
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

                        {/* Products list */}
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

                        {/* Totals */}
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
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid #1e1e1c", marginTop:"4px" }}>
                  <span style={{ fontSize:11, color:"#5a5a56" }}>
                    Mostrando {Math.min((salesPage-1)*ORDERS_PER_PAGE+1, filteredOrders.length)}–{Math.min(salesPage*ORDERS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length} pedidos
                  </span>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setSalesPage(p=>p-1)} disabled={salesPage===1} style={{ padding:"5px 12px", background:"transparent", border:"1px solid #272725", borderRadius:6, color: salesPage===1 ? "#333":"#99907c", cursor: salesPage===1 ? "not-allowed":"pointer", fontSize:12 }}>← Anterior</button>
                    <button onClick={()=>setSalesPage(p=>p+1)} disabled={salesPage*ORDERS_PER_PAGE>=filteredOrders.length} style={{ padding:"5px 12px", background:"transparent", border:"1px solid #272725", borderRadius:6, color: salesPage*ORDERS_PER_PAGE>=filteredOrders.length ? "#333":"#99907c", cursor: salesPage*ORDERS_PER_PAGE>=filteredOrders.length ? "not-allowed":"pointer", fontSize:12 }}>Siguiente →</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ════════ RESEÑAS ════════ */}
        {activeTab === "Reseñas" && (
          <div className="reviews-tab">

            {/* ── Header + nueva reseña ── */}
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

            {/* ── Inline add form ── */}
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

            {/* ── Reviews list ── */}
            <div className="reviews-tab__list">
              {reviews
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
                          onClick={() => { if (window.confirm("¿Eliminar esta reseña?")) deleteReview(r.id); }}
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
              {reviews.filter(r => reviewFilter === "all" ? true : reviewFilter === "pending" ? !r.approved : r.approved).length === 0 && (
                <p className="reviews-tab__empty">No hay reseñas en esta categoría.</p>
              )}
            </div>

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

            {/* ── Historial de precios ────────────────────── */}
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

      {/* ── Modal eliminar producto ──────────────────────── */}
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

    {/* ── Boleta de envío ──────────────────────────────────── */}
    {shippingLabelOrder && (
      <ShippingLabelModal
        order={shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
      />
    )}

    {/* ── Notificación de envío ─────────────────────────────── */}
    {shippingNotifyOrder && (
      <ShippingNotifyModal
        order={shippingNotifyOrder}
        onClose={() => setShippingNotifyOrder(null)}
        onConfirm={() => setShippingNotifyOrder(null)}
      />
    )}

    {statusConfirm && createPortal(
      <div onClick={() => setStatusConfirm(null)} style={{ position:"fixed", inset:0, zIndex:200000, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#161614", border:"1px solid #272725", borderRadius:12, padding:"28px 28px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }}>
          <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.14em", color:"#D4AF37", fontWeight:700, marginBottom:8 }}>Confirmar cambio</p>
          <h3 style={{ fontSize:17, fontWeight:700, color:"#ede8df", marginBottom:8 }}>¿Cambiar a {statusConfirm.label}?</h3>
          <p style={{ fontSize:13, color:"#6a6460", marginBottom:24, lineHeight:1.5 }}>Esta acción es difícil de revertir. ¿Estás seguro?</p>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={() => setStatusConfirm(null)} style={{ padding:"8px 18px", background:"transparent", border:"1px solid #272725", borderRadius:8, color:"#6a6460", cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={() => { updateOrderStatus(statusConfirm.id, statusConfirm.next); setStatusConfirm(null); }} style={{ padding:"8px 18px", background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8, color:"#D4AF37", cursor:"pointer", fontSize:13, fontWeight:600 }}>Confirmar</button>
          </div>
        </div>
      </div>
    , document.body)}
    </>
  );
};

export default Admin;
