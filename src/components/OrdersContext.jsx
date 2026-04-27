/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { sbFetch, sbUrl, sbKey } from "../lib/supabaseHelpers";

export const OrdersContext = createContext(null);

const LS_KEY = "rixx_orders";

// ── Google Sheets webhook ─────────────────────────────────────────────────────
// Set VITE_GOOGLE_SHEETS_WEBHOOK in .env to enable automatic row append on delivery.
const SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK;

async function sheetsWebhook(payload) {
  if (!SHEETS_URL) return false;
  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[OrdersContext] Google Sheets webhook error ${res.status} — verificá que el escenario de Make esté activo.`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[OrdersContext] Google Sheets webhook failed:", err.message);
    return false;
  }
}

// Formatea el número de orden: 001RX, 002RX, etc.
export function formatOrderNumber(order) {
  if (order?.order_number) return String(order.order_number).padStart(3, "0") + "RX";
  return (order?.id || "").toString().slice(0, 8).toUpperCase();
}

async function postToSheets(order) {
  const items = (() => { try { const it = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []); return it.map(i => `${i.name} x${i.qty}`).join(", "); } catch { return "—"; } })();
  return await sheetsWebhook({
    action:       "add",
    id:           formatOrderNumber(order),
    fecha:        order.created_at ? new Date(order.created_at).toLocaleDateString("es-UY") : new Date().toLocaleDateString("es-UY"),
    cliente:      order.user_name  || "—",
    email:        order.user_email || "—",
    telefono:     order.user_phone || "—",
    productos:    items,
    subtotal:     order.subtotal   || 0,
    envio:        order.shipping   || 0,
    descuento:    order.discount   || 0,
    total:        order.total      || 0,
    pago:         order.payment_method || "—",
    departamento: order.departamento   || "—",
    direccion:    order.direccion      || "—",
  });
}

async function deleteFromSheets(order) {
  await sheetsWebhook({
    action: "delete",
    id:     formatOrderNumber(order),
  });
}

async function notifyAdmin(order) {
  const items = (() => { try { const it = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []); return it.map(i => `${i.name} x${i.qty}`).join(", "); } catch { return "—"; } })();
  await sheetsWebhook({
    action:     "new_order",
    id:         formatOrderNumber(order),
    fecha:      order.created_at ? new Date(order.created_at).toLocaleDateString("es-UY") : new Date().toLocaleDateString("es-UY"),
    cliente:    order.user_name  || "—",
    email:      order.user_email || "—",
    telefono:   order.user_phone || "—",
    productos:  items,
    total:      order.total      || 0,
    pago:       order.payment_method || "—",
  });
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function readLocalOrders() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(orders.slice(0, 1)));
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OrdersProvider({ children }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const isSubmitting          = useRef(false);

  // ── createOrder ─────────────────────────────────────────────────────────────
  const createOrder = useCallback(async (orderData) => {
    if (isSubmitting.current) return null;
    isSubmitting.current = true;

    try {
      if (isSupabaseEnabled) {
        const payload = {
          user_email:        orderData.user_email        ?? null,
          user_name:         orderData.user_name         ?? null,
          user_phone:        orderData.user_phone        ?? null,
          shipping_address:  orderData.shipping_address  ?? null,
          items:             orderData.items             ?? [],
          subtotal:          orderData.subtotal          ?? 0,
          shipping:          orderData.shipping          ?? 0,
          discount:          orderData.discount          ?? 0,
          total:             orderData.total             ?? 0,
          coupon_code:       orderData.coupon_code       ?? null,
          status:            orderData.status            ?? "confirmado",
          payment_method:    orderData.payment_method    ?? null,
          notes:             orderData.notes             ?? null,
          source:            orderData.source            ?? null,
          free_shipping:     orderData.free_shipping     ?? false,
          confirmation_sent: orderData.confirmation_sent ?? false,
          marketing_opt_in:  orderData.marketing_opt_in  ?? false,
          direccion:         orderData.shipping_address?.direccion    ?? null,
          departamento:      orderData.shipping_address?.departamento ?? null,
        };

        try {
          const data = await sbFetch("orders", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const inserted = Array.isArray(data) ? data[0] : data;
          if (inserted) {
            const full = { ...orderData, ...inserted };
            setOrders((prev) => [full, ...prev]);
            notifyAdmin(full);
            if (full.status === "entregado") postToSheets(full);
            if (orderData.coupon_code) {
              const code = orderData.coupon_code;
              sbFetch(`coupons?code=eq.${encodeURIComponent(code)}&select=used_count`)
                .then((rows) => {
                  const current = Array.isArray(rows) && rows[0] ? rows[0].used_count ?? 0 : 0;
                  return sbFetch(`coupons?code=eq.${encodeURIComponent(code)}`, {
                    method: "PATCH",
                    body: JSON.stringify({ used_count: current + 1 }),
                  });
                })
                .catch(() => {});
            }
            return full;
          }
        } catch (err) {
          console.warn("[OrdersContext] createOrder sbFetch falló, usando fallback localStorage:", err.message);
        }
      }

      // Fallback: localStorage
      const newOrder = {
        ...orderData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      const existing = readLocalOrders();
      writeLocalOrders([newOrder, ...existing]);
      setOrders((prev) => [newOrder, ...prev]);
      notifyAdmin(newOrder);
      if (newOrder.status === "entregado") postToSheets(newOrder);
      return newOrder;
    } finally {
      isSubmitting.current = false;
    }
  }, []);

  // ── getUserOrders ────────────────────────────────────────────────────────────
  const getUserOrders = useCallback(async (email) => {
    if (!email) return [];
    setLoading(true);
    try {
      const localAll    = readLocalOrders();
      const localOrders = localAll.filter((o) => o.user_email === email);

      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_email", email)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[OrdersContext] Supabase fetch error:", error);
          setOrders(localOrders);
          return localOrders;
        }

        // Supabase is source of truth — use only remote data, never merge with localStorage.
        const remote = (data ?? []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(remote);
        return remote;
      }

      setOrders(localOrders);
      return localOrders;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── getAllOrders ─────────────────────────────────────────────────────────────
  const getAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseEnabled) {
        try {
          const data = await sbFetch("orders?select=*&order=created_at.desc");
          const remote = Array.isArray(data) ? data : [];
          // Supabase is source of truth — wipe local cache to match exactly,
          // so deleted orders never resurrect on next load.
          writeLocalOrders(remote);
          setOrders(remote);
          return remote;
        } catch (err) {
          console.warn("[OrdersContext] getAllOrders falló, usando localStorage:", err.message);
        }
      }

      const local = readLocalOrders().sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(local);
      return local;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── updateOrderStatus ────────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (id, status, orderData = null) => {
    // Update UI immediately so the admin sees the change right away
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    // Update localStorage
    const all     = readLocalOrders();
    const updated = all.map((o) => (o.id === id ? { ...o, status } : o));
    writeLocalOrders(updated);

    // Persist to Supabase in background (raw fetch, no hanging)
    if (isSupabaseEnabled && sbUrl() && sbKey()) {
      try {
        await sbFetch(`orders?id=eq.${encodeURIComponent(id)}`, {
          method:  "PATCH",
          body:    JSON.stringify({ status }),
        });
      } catch (err) {
        console.warn("[OrdersContext] updateOrderStatus Supabase failed (UI already updated):", err.message);
      }
    }

    // If order just became "entregado", send to Google Sheets
    if (status === "entregado") {
      const order = orderData ?? orders.find(o => o.id === id) ?? all.find(o => o.id === id);
      if (order) return postToSheets({ ...order, status });
    }
    return true;
  }, [orders]);

  // ── updateOrderFields ────────────────────────────────────────────────────────
  const updateOrderFields = useCallback(async (id, fields) => {
    // Update UI immediately
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));

    // Update localStorage
    const all     = readLocalOrders();
    const updated = all.map((o) => (o.id === id ? { ...o, ...fields } : o));
    writeLocalOrders(updated);

    // Persist to Supabase in background
    if (isSupabaseEnabled && sbUrl() && sbKey()) {
      try {
        await sbFetch(`orders?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          body:   JSON.stringify(fields),
        });
      } catch (err) {
        console.warn("[OrdersContext] updateOrderFields Supabase failed (UI already updated):", err.message);
      }
    }
  }, []);

  // ── deleteOrder ──────────────────────────────────────────────────────────────
  const deleteOrder = useCallback(async (id) => {
    const orderToDelete = orders.find(o => o.id === id) ?? readLocalOrders().find(o => o.id === id);

    if (isSupabaseEnabled) {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) {
        console.warn("[OrdersContext] deleteOrder Supabase error:", error.message);
        return false;
      }
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));
    writeLocalOrders(readLocalOrders().filter((o) => o.id !== id));
    if (orderToDelete) deleteFromSheets(orderToDelete);
    return true;
  }, [orders]);

  // ── syncEntregadosToSheets ────────────────────────────────────────────────────
  // Manda todas las órdenes "entregado" al Google Sheet (para sincronización masiva)
  const syncEntregadosToSheets = useCallback(async () => {
    const entregados = orders.filter(o => o.status === "entregado");
    let ok = 0;
    for (const order of entregados) {
      const success = await postToSheets(order);
      if (success) ok++;
    }
    return { total: entregados.length, ok, fail: entregados.length - ok };
  }, [orders]);

  const value = {
    orders,
    loading,
    createOrder,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    updateOrderFields,
    deleteOrder,
    syncEntregadosToSheets,
  };

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrdersProvider>");
  return ctx;
}
