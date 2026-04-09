import { createContext, useState, useMemo, useRef } from "react";

// ── Imports de imágenes ───────────────────────────────────────
import img1 from "../assets/img/1.webp";
import img2 from "../assets/img/2.webp";
import img3 from "../assets/img/3.webp";
import img4 from "../assets/img/4.webp";
import img5 from "../assets/img/5.webp";
import img6 from "../assets/img/6.webp";
import img7 from "../assets/img/7.webp";
import img8 from "../assets/img/8.webp";

export const ProductsContext = createContext();

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Vintage A",
    price: 120,
    image: img1,
    category: "Classic",
    stock: 3,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Diseño clásico atemporal con montura fina",
    characteristics: ["Montura fina", "UV400", "Ligeros"],
    precioCosto: 54,
    status: "activo",
    images: [img1],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 120, fecha: "2025-01-01" }],
  },
  {
    id: 2,
    name: "Vintage B",
    price: 150,
    image: img2,
    category: "Classic",
    stock: 0,
    featured: true,
    isNew: false,
    rating: 5,
    description: "Lentes vintage de edición limitada premium",
    characteristics: ["Edición limitada", "Clásico", "Premium"],
    precioCosto: 68,
    status: "activo",
    images: [img2],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 150, fecha: "2025-01-01" }],
  },
  {
    id: 3,
    name: "Urban Shield",
    price: 99,
    image: img3,
    category: "Sport",
    stock: 5,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Resistentes y ligeros para el día a día urbano",
    characteristics: ["Anti-impacto", "Ligeros", "Resistentes"],
    precioCosto: 44,
    status: "activo",
    images: [img3],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 99, fecha: "2025-01-01" }],
  },
  {
    id: 4,
    name: "Night Vision",
    price: 135,
    image: img4,
    category: "Sport",
    stock: 2,
    featured: true,
    isNew: false,
    rating: 4,
    description: "Alto contraste para uso nocturno y deportivo",
    characteristics: ["Alto contraste", "Anti-reflejo", "Sport"],
    precioCosto: 61,
    status: "activo",
    images: [img4],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 135, fecha: "2025-01-01" }],
  },
  {
    id: 5,
    name: "Gold Frame",
    price: 175,
    image: img5,
    category: "Luxury",
    stock: 4,
    featured: true,
    isNew: false,
    rating: 5,
    description: "Montura dorada con cristales de lujo premium",
    characteristics: ["Montura dorada", "Cristales premium", "Lujo"],
    precioCosto: 80,
    status: "activo",
    images: [img5],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 175, fecha: "2025-01-01" }],
  },
  {
    id: 6,
    name: "Classic Elite",
    price: 145,
    image: img6,
    category: "Classic",
    stock: 6,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Elegancia clásica para el estilo contemporáneo",
    characteristics: ["Elegante", "Clásico", "Versátil"],
    precioCosto: 65,
    status: "activo",
    images: [img6],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 145, fecha: "2025-01-01" }],
  },
  {
    id: 7,
    name: "Titanium Edge Pro",
    price: 189.99,
    image: img7,
    category: "Sport",
    stock: 8,
    featured: true,
    isNew: true,
    rating: 5,
    description: "Lentes deportivos anti-reflejo de titanio puro",
    characteristics: ["Anti-reflejo", "Titanio", "Ultra-ligeros"],
    precioCosto: 86,
    status: "activo",
    images: [img7],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 189.99, fecha: "2025-01-01" }],
  },
  {
    id: 8,
    name: "Aviator Luxe Retro",
    price: 159.99,
    image: img8,
    category: "Classic",
    stock: 5,
    featured: true,
    isNew: true,
    rating: 5,
    description: "Diseño vintage clásico inspirado en los años 70s",
    characteristics: ["Vintage", "Clásico", "Elegante"],
    precioCosto: 72,
    status: "activo",
    images: [img8],
    variants: [],
    descuento: null,
    priceHistory: [{ precio: 159.99, fecha: "2025-01-01" }],
  },
];

// ── Helpers ────────────────────────────────────────────────────
const now = () => new Date().toLocaleString("es-UY");

export const ProductsProvider = ({ children }) => {
  const [products, setProducts]             = useState(INITIAL_PRODUCTS);
  const nextIdRef = useRef(Math.max(...INITIAL_PRODUCTS.map((p) => p.id), 0) + 1);
  const [history, setHistory]               = useState([]);           // historial de stock
  const [changeLog, setChangeLog]           = useState([]);           // cambios sin guardar
  const [hasUnsavedChanges, setHasUnsaved]  = useState(false);
  const [lastSavedAt, setLastSavedAt]       = useState(null);

  // ── Filtros (para ProductsGrid) ──────────────────────────────
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [priceFilter, setPriceFilter]       = useState("Todos");
  const [sortOrder, setSortOrder]           = useState("nuevo");

  // ── Filtro por rango de precio (slider) ──────────────────────
  const [minPrice, setMinPrice]             = useState(0);
  const [maxPrice, setMaxPrice]             = useState(9999);

  // Registra un cambio en el log
  const logChange = (type, product, extra = {}) => {
    setChangeLog((prev) => [
      ...prev,
      {
        timestamp: now(),
        tipo: type,
        id: product.id,
        nombre: product.name,
        operador: "admin",
        ...extra,
      },
    ]);
    setHasUnsaved(true);
  };

  // ── CRUD ────────────────────────────────────────────────────
  const addProduct = (data) => {
    const newProduct = { ...data, id: nextIdRef.current++, featured: false, isNew: true, rating: 0, status: "activo" };
    setProducts((prev) => [...prev, newProduct]);
    logChange("ALTA", newProduct, { detalle: `Precio: $${data.price} · Stock: ${data.stock}` });
  };

  const removeProduct = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    logChange("BAJA", product, { detalle: "Producto eliminado" });
  };

  const updateProduct = (updated) => {
    const old = products.find((p) => p.id === updated.id);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    if (old) {
      const diffs = [];
      if (old.stock       !== updated.stock)       diffs.push(`Stock: ${old.stock} → ${updated.stock}`);
      if (old.price       !== updated.price)       diffs.push(`Precio: ${old.price} → ${updated.price}`);
      if (old.name        !== updated.name)        diffs.push(`Nombre: "${old.name}" → "${updated.name}"`);
      if (old.featured    !== updated.featured)    diffs.push(`Destacado: ${old.featured ? "Sí" : "No"} → ${updated.featured ? "Sí" : "No"}`);
      if (old.status      !== updated.status)      diffs.push(`Status: "${old.status || "activo"}" → "${updated.status || "activo"}"`);
      if (old.precioCosto !== updated.precioCosto) diffs.push(`Costo: ${old.precioCosto ?? "—"} → ${updated.precioCosto ?? "—"}`);
      if (diffs.length > 0) logChange("MODIFICACIÓN", old, { detalle: diffs.join(" | ") });
    }
  };

  const toggleFeatured = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newVal = !product.featured;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: newVal } : p)));
    logChange("DESTACADO", product, { detalle: newVal ? "Marcado como destacado" : "Quitado de destacados" });
  };

  // ── Historial de stock ───────────────────────────────────────
  const recordStockHistory = (id, oldStock, newStock) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setHistory((prev) => [
      ...prev,
      { timestamp: now(), id, name: product.name, oldStock, newStock },
    ]);
  };

  // ── Marcar como guardado (llamado por Admin al exportar) ──────
  const markProductsExported = () => {
    setHasUnsaved(false);
    setLastSavedAt(now());
  };

  const clearChangeLog = () => {
    setChangeLog([]);
  };

  // ── Status ───────────────────────────────────────────────────
  const updateProductStatus = (id, status) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    logChange("STATUS", product, { detalle: `Status cambiado a "${status}"` });
  };

  // ── Descuentos ───────────────────────────────────────────────
  const applyDiscount = (id, { porcentaje, hasta }) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, descuento: { porcentaje, hasta } } : p))
    );
    logChange("DESCUENTO", product, { detalle: `Descuento ${porcentaje}% hasta ${hasta}` });
  };

  const removeDiscount = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, descuento: null } : p)));
    logChange("DESCUENTO", product, { detalle: "Descuento eliminado" });
  };

  // ── filteredProducts ─────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => !p.status || p.status === "activo");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "Todos") result = result.filter((p) => p.category === categoryFilter);
    if (priceFilter === "bajo")     result = result.filter((p) => p.price < 100);
    if (priceFilter === "medio")    result = result.filter((p) => p.price >= 100 && p.price <= 150);
    if (priceFilter === "alto")     result = result.filter((p) => p.price > 150);
    result = result.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    if (sortOrder === "precio-asc")  result.sort((a, b) => a.price - b.price);
    if (sortOrder === "precio-desc") result.sort((a, b) => b.price - a.price);
    if (sortOrder === "nuevo")       result.sort((a, b) => b.id - a.id);
    return result;
  }, [products, search, categoryFilter, priceFilter, sortOrder, minPrice, maxPrice]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        filteredProducts,
        history,
        changeLog,
        hasUnsavedChanges,
        lastSavedAt,
        // CRUD
        addProduct,
        removeProduct,
        updateProduct,
        toggleFeatured,
        recordStockHistory,
        markProductsExported,
        clearChangeLog,
        // Status y descuentos
        updateProductStatus,
        applyDiscount,
        removeDiscount,
        // Filtros básicos
        search, setSearch,
        categoryFilter, setCategoryFilter,
        priceFilter, setPriceFilter,
        sortOrder, setSortOrder,
        // Filtro por rango de precio
        minPrice, setMinPrice,
        maxPrice, setMaxPrice,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};
