import { createContext, useState, useMemo, useRef, useEffect } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

export const ProductsContext = createContext();

// ── Detectar si Supabase está configurado ────────────────────
const SUPABASE_ENABLED = isSupabaseEnabled;


// ── DB ↔ JS mapping helpers ──────────────────────────────────
const dbToProduct = (row) => ({
  id:             row.id,
  name:           row.name,
  price:          Number(row.price),
  precioCosto:    row.precio_costo != null ? Number(row.precio_costo) : null,
  image:          (row.image && !row.image.startsWith("blob:")) ? row.image : null,
  category:       row.category,
  description:    row.description ?? "",
  stock:          row.stock ?? 0,
  featured:       row.featured ?? false,
  isNew:          row.is_new ?? false,
  rating:         row.rating != null ? Number(row.rating) : 0,
  status:         row.status ?? "activo",
  characteristics: row.characteristics ?? [],
  images:         row.images ?? [],
  variants:       row.variants ?? [],
  descuento:      row.descuento ?? null,
  priceHistory:   row.price_history ?? [],
});

const productToDb = (product) => ({
  name:           product.name,
  price:          product.price,
  precio_costo:   product.precioCosto ?? null,
  image:          product.image ?? null,
  category:       product.category,
  description:    product.description ?? "",
  stock:          product.stock ?? 0,
  featured:       product.featured ?? false,
  is_new:         product.isNew ?? false,
  rating:         product.rating ?? 0,
  status:         product.status ?? "activo",
  characteristics: product.characteristics ?? [],
  images:         product.images ?? [],
  variants:       product.variants ?? [],
  descuento:      product.descuento ?? null,
  price_history:  product.priceHistory ?? [],
});

// ── Helpers ────────────────────────────────────────────────────
const now = () => new Date().toLocaleString("es-UY");

export const ProductsProvider = ({ children }) => {
  // In fallback mode nextIdRef tracks the auto-increment; unused in Supabase mode.
  const nextIdRef = useRef(1);

  const [products, setProducts]             = useState(() => {
    if (SUPABASE_ENABLED) return [];
    try {
      const stored = localStorage.getItem("rixx_products");
      if (stored) return JSON.parse(stored);
    } catch { /* ignorar */ }
    return [];
  });
  const [loading, setLoading]               = useState(SUPABASE_ENABLED);
  const [history, setHistory]               = useState([]);
  const [changeLog, setChangeLog]           = useState([]);
  const [hasUnsavedChanges, setHasUnsaved]  = useState(false);
  const [lastSavedAt, setLastSavedAt]       = useState(null);

  // ── Filtros ──────────────────────────────────────────────────
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [priceFilter, setPriceFilter]       = useState("Todos");
  const [sortOrder, setSortOrder]           = useState("nuevo");
  const [minPrice, setMinPrice]             = useState(0);
  const [maxPrice, setMaxPrice]             = useState(9999);

  // ── Persistir productos en localStorage (modo sin Supabase) ──
  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      localStorage.setItem("rixx_products", JSON.stringify(products));
    }
  }, [products]);

  // ── Fetch inicial desde Supabase (raw fetch, no espera auth) ──
  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    // Muestra caché inmediatamente mientras carga en segundo plano
    try {
      const cached = localStorage.getItem("rixx_products_cache");
      if (cached) setProducts(JSON.parse(cached));
    } catch { /* ignorar */ }

    const fetchProducts = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const mapped = data.map(dbToProduct);
        setProducts(mapped);
        try { localStorage.setItem("rixx_products_cache", JSON.stringify(mapped)); } catch { /* ignorar */ }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[ProductsContext] Fetch directo falló, usando caché:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ── Persistir entrada en change_log de Supabase ──────────────
  const persistChangeLog = async (entry) => {
    if (!SUPABASE_ENABLED) return;
    try {
      const { error } = await supabase.from("change_log").insert({
        timestamp:  entry.timestamp,
        tipo:       entry.tipo,
        product_id: entry.id,
        nombre:     entry.nombre,
        operador:   entry.operador,
        detalle:    entry.detalle ?? null,
      });
      if (error) console.error("[ProductsContext] Error persisting change_log:", error);
    } catch (err) {
      console.error("[ProductsContext] Unexpected error persisting change_log:", err);
    }
  };

  // ── Log de cambios (local + Supabase) ────────────────────────
  const logChange = (type, product, extra = {}) => {
    const entry = {
      timestamp: now(),
      tipo:      type,
      id:        product.id,
      nombre:    product.name,
      operador:  "admin",
      ...extra,
    };
    setChangeLog((prev) => [...prev, entry]);
    setHasUnsaved(true);
    persistChangeLog(entry);
  };

  // ── addProduct ───────────────────────────────────────────────
  const addProduct = async (data) => {
    if (!SUPABASE_ENABLED) {
      const newProduct = {
        ...data,
        id:       nextIdRef.current++,
        featured: false,
        isNew:    true,
        rating:   0,
        status:   "activo",
      };
      setProducts((prev) => [...prev, newProduct]);
      logChange("ALTA", newProduct, { detalle: `Precio: $${data.price} · Stock: ${data.stock}` });
      return;
    }

    try {
      const dbRow = productToDb({
        ...data,
        featured: false,
        isNew:    true,
        rating:   0,
        status:   "activo",
      });

      const { data: inserted, error } = await supabase
        .from("products")
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        console.error("[ProductsContext] Error inserting product:", error);
        return;
      }

      const newProduct = dbToProduct(inserted);
      setProducts((prev) => {
        const next = [newProduct, ...prev];
        try { localStorage.setItem("rixx_products_cache", JSON.stringify(next)); } catch { /* ignorar */ }
        return next;
      });
      logChange("ALTA", newProduct, { detalle: `Precio: $${data.price} · Stock: ${data.stock}` });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in addProduct:", err);
    }
  };

  // ── removeProduct ────────────────────────────────────────────
  const removeProduct = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      logChange("BAJA", product, { detalle: "Producto eliminado" });
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        console.error("[ProductsContext] Error deleting product:", error);
        return;
      }
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        try { localStorage.setItem("rixx_products_cache", JSON.stringify(next)); } catch { /* ignorar */ }
        return next;
      });
      logChange("BAJA", product, { detalle: "Producto eliminado" });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in removeProduct:", err);
    }
  };

  // ── updateProduct ────────────────────────────────────────────
  const updateProduct = async (updated) => {
    const old = products.find((p) => p.id === updated.id);

    // Compute diffs before touching state
    const diffs = [];
    if (old) {
      if (old.stock       !== updated.stock)       diffs.push(`Stock: ${old.stock} → ${updated.stock}`);
      if (old.price       !== updated.price)       diffs.push(`Precio: ${old.price} → ${updated.price}`);
      if (old.name        !== updated.name)        diffs.push(`Nombre: "${old.name}" → "${updated.name}"`);
      if (old.featured    !== updated.featured)    diffs.push(`Destacado: ${old.featured ? "Sí" : "No"} → ${updated.featured ? "Sí" : "No"}`);
      if (old.status      !== updated.status)      diffs.push(`Status: "${old.status || "activo"}" → "${updated.status || "activo"}"`);
      if (old.precioCosto !== updated.precioCosto) diffs.push(`Costo: ${old.precioCosto ?? "—"} → ${updated.precioCosto ?? "—"}`);
    }

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      if (old && diffs.length > 0) logChange("MODIFICACIÓN", old, { detalle: diffs.join(" | ") });
      return;
    }

    try {
      const dbRow = productToDb(updated);
      const { error } = await supabase
        .from("products")
        .update(dbRow)
        .eq("id", updated.id);

      if (error) {
        console.error("[ProductsContext] Error updating product:", error);
        return;
      }

      setProducts((prev) => {
        const next = prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
        try { localStorage.setItem("rixx_products_cache", JSON.stringify(next)); } catch { /* ignorar */ }
        return next;
      });
      if (old && diffs.length > 0) logChange("MODIFICACIÓN", old, { detalle: diffs.join(" | ") });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in updateProduct:", err);
    }
  };

  // ── toggleFeatured ───────────────────────────────────────────
  const toggleFeatured = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newVal = !product.featured;

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: newVal } : p)));
      logChange("DESTACADO", product, { detalle: newVal ? "Marcado como destacado" : "Quitado de destacados" });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ featured: newVal })
        .eq("id", id);

      if (error) {
        console.error("[ProductsContext] Error toggling featured:", error);
        return;
      }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: newVal } : p)));
      logChange("DESTACADO", product, { detalle: newVal ? "Marcado como destacado" : "Quitado de destacados" });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in toggleFeatured:", err);
    }
  };

  // ── updateProductStatus ──────────────────────────────────────
  const updateProductStatus = async (id, status) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      logChange("STATUS", product, { detalle: `Status cambiado a "${status}"` });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("[ProductsContext] Error updating status:", error);
        return;
      }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      logChange("STATUS", product, { detalle: `Status cambiado a "${status}"` });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in updateProductStatus:", err);
    }
  };

  // ── applyDiscount ────────────────────────────────────────────
  const applyDiscount = async (id, { porcentaje, hasta }) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const descuento = { porcentaje, hasta };

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, descuento } : p)));
      logChange("DESCUENTO", product, { detalle: `Descuento ${porcentaje}% hasta ${hasta}` });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ descuento })
        .eq("id", id);

      if (error) {
        console.error("[ProductsContext] Error applying discount:", error);
        return;
      }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, descuento } : p)));
      logChange("DESCUENTO", product, { detalle: `Descuento ${porcentaje}% hasta ${hasta}` });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in applyDiscount:", err);
    }
  };

  // ── removeDiscount ───────────────────────────────────────────
  const removeDiscount = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (!SUPABASE_ENABLED) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, descuento: null } : p)));
      logChange("DESCUENTO", product, { detalle: "Descuento eliminado" });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ descuento: null })
        .eq("id", id);

      if (error) {
        console.error("[ProductsContext] Error removing discount:", error);
        return;
      }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, descuento: null } : p)));
      logChange("DESCUENTO", product, { detalle: "Descuento eliminado" });
    } catch (err) {
      console.error("[ProductsContext] Unexpected error in removeDiscount:", err);
    }
  };

  // ── Historial de stock (local only) ─────────────────────────
  const recordStockHistory = (id, oldStock, newStock) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setHistory((prev) => [
      ...prev,
      { timestamp: now(), id, name: product.name, oldStock, newStock },
    ]);
  };

  // ── Marcar como guardado ─────────────────────────────────────
  const markProductsExported = () => {
    setHasUnsaved(false);
    setLastSavedAt(now());
  };

  const clearChangeLog = () => {
    setChangeLog([]);
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
    if (sortOrder === "nuevo")       result.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    return result;
  }, [products, search, categoryFilter, priceFilter, sortOrder, minPrice, maxPrice]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        filteredProducts,
        loading,
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
