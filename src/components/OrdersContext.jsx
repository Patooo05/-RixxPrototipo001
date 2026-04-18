import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

export const OrdersContext = createContext(null);

const LS_KEY = "rixx_orders";

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
    // Guardar solo las últimas 20 para no llenar el localStorage
    const trimmed = orders.slice(0, 20);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    // Si sigue lleno, limpiar todo y guardar solo la más reciente
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(orders.slice(0, 1)));
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }
}

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  // ── createOrder ────────────────────────────────────────────────────────────
  const createOrder = useCallback(async (orderData) => {
    // Bloquear doble submit
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

        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve({ __timeout: true }), 12000)
        );

        const result = await Promise.race([
          supabase.from("orders").insert([payload]).select().single(),
          timeout,
        ]);

        if (result?.__timeout) {
          console.warn("[OrdersContext] createOrder timeout — usando fallback localStorage");
          // Caer al fallback sin lanzar error
        } else {
          const { data, error } = result;
          if (!error && data) {
            const full = { ...orderData, ...data };
            setOrders((prev) => [full, ...prev]);
            return full;
          }
          console.error("[OrdersContext] Supabase insert error:", error?.message);
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
      return newOrder;
    } finally {
      isSubmitting.current = false;
    }
  }, []);

  // ── getUserOrders ──────────────────────────────────────────────────────────
  const getUserOrders = useCallback(async (email) => {
    if (!email) return [];
    setLoading(true);

    try {
      const localAll = readLocalOrders();
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

        const remote = data ?? [];
        const remoteIds = new Set(remote.map((o) => o.id));
        const localOnly = localOrders.filter((o) => !remoteIds.has(o.id));
        const merged = [...remote, ...localOnly].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(merged);
        return merged;
      }

      // Fallback: localStorage only
      setOrders(localOrders);
      return localOrders;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── getAllOrders ───────────────────────────────────────────────────────────
  const getAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      const local = readLocalOrders();
      let remote = [];

      if (isSupabaseEnabled) {
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve({ __timeout: true }), 15000)
        );

        const result = await Promise.race([
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
          timeout,
        ]);

        if (result?.__timeout) {
          console.warn("[OrdersContext] getAllOrders timeout — retornando órdenes de localStorage");
          const merged = local.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setOrders(merged);
          return merged;
        }

        const { data, error } = result;
        if (error) {
          console.error("[OrdersContext] Supabase getAllOrders error:", error);
        } else {
          remote = data ?? [];
          // Si Supabase funciona, limpiar localStorage — Supabase es la fuente de verdad
          // Solo conservar órdenes locales que todavía no están en Supabase
          const remoteIds = new Set(remote.map(o => o.id));
          const pendingLocal = local.filter(o => !remoteIds.has(o.id));
          if (pendingLocal.length !== local.length) {
            writeLocalOrders(pendingLocal);
          }
        }
      }

      // Merge: Supabase orders + local orders not already in Supabase
      const remoteIds = new Set(remote.map(o => o.id));
      const localOnly = local.filter(o => !remoteIds.has(o.id));
      const merged = [...remote, ...localOnly].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setOrders(merged);
      return merged;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── updateOrderStatus ──────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (id, status) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
        return data;
      }
      // If Supabase fails (order may be localStorage-only), fall through
      console.warn("[OrdersContext] Supabase update failed, falling back to localStorage:", error);
    }

    // Fallback: localStorage (also used for localStorage-only orders when Supabase is enabled)
    const all = readLocalOrders();
    const updated = all.map((o) => (o.id === id ? { ...o, status } : o));
    writeLocalOrders(updated);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }, []);

  // ── deleteOrder ───────────────────────────────────────────────────────────────
  const deleteOrder = useCallback(async (id) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) console.warn("[OrdersContext] deleteOrder error:", error.message);
    }
    const all = readLocalOrders();
    writeLocalOrders(all.filter((o) => o.id !== id));
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // ── updateOrderFields ──────────────────────────────────────────────────────
  const updateOrderFields = useCallback(async (id, fields) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from("orders")
        .update(fields)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, ...fields } : o))
        );
        return data;
      }
      console.warn("[OrdersContext] Supabase updateOrderFields failed, falling back to localStorage:", error);
    }

    const all = readLocalOrders();
    const updated = all.map((o) => (o.id === id ? { ...o, ...fields } : o));
    writeLocalOrders(updated);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
  }, []);

  const value = {
    orders,
    loading,
    createOrder,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    updateOrderFields,
    deleteOrder,
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
