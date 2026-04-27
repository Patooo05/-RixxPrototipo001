/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";
import { ProductsContext } from "./ProductsContext";
import { isSupabaseEnabled } from "../lib/supabase";
import { sbFetch } from "../lib/supabaseHelpers";

const WishlistContext = createContext(null);

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = "rixx_wishlist";

const readLocalStorage = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeLocalStorage = (items) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* ignorar */ }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const WishlistProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const { products }    = useContext(ProductsContext);
  const email = currentUser?.email ?? null;

  const useSupabase = isSupabaseEnabled && !!email;

  const [items, setItems]                   = useState(readLocalStorage);
  const [loading, setLoading]               = useState(false);
  const [orphansRemovedCount, setOrphansRemovedCount] = useState(0);

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Sync with Supabase on login / user change ─────────────────────────────
  useEffect(() => {
    if (!useSupabase) {
      if (!email) setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchWishlist = async () => {
      try {
        const data = await sbFetch(
          `wishlist?select=product_id&user_email=eq.${encodeURIComponent(email)}`
        );
        if (cancelled) return;
        setItems((data ?? []).map((row) => row.product_id));
      } catch (err) {
        if (cancelled) return;
        console.warn("[Wishlist] fetch falló, usando fallback local:", err.message);
        setItems(readLocalStorage());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWishlist();
    return () => { cancelled = true; };
  }, [useSupabase, email]);

  // ── Persist to localStorage when NOT using Supabase ──────────────────────
  useEffect(() => {
    if (!useSupabase) writeLocalStorage(items);
  }, [items, useSupabase]);

  // ── Cleanup orphan IDs when catalog updates ───────────────────────────────
  useEffect(() => {
    if (!products || products.length === 0) return;
    if (items.length === 0) return;
    const productIds = new Set(products.map((p) => String(p.id)));
    const orphans = items.filter((id) => !productIds.has(String(id)));
    if (orphans.length === 0) return;
    const cleaned = items.filter((id) => productIds.has(String(id)));
    setItems(cleaned);
    setOrphansRemovedCount(orphans.length);
    if (useSupabase && email) {
      orphans.forEach((id) => {
        sbFetch(
          `wishlist?user_email=eq.${encodeURIComponent(email)}&product_id=eq.${encodeURIComponent(String(id))}`,
          { method: "DELETE" }
        ).catch((err) => console.warn("[Wishlist] cleanup orphan delete error:", err.message));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const dismissOrphansNotice = () => setOrphansRemovedCount(0);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleWishlist = async (productId) => {
    const idStr = String(productId);

    if (!useSupabase) {
      setItems((prev) =>
        prev.some((i) => String(i) === idStr)
          ? prev.filter((i) => String(i) !== idStr)
          : [...prev, productId]
      );
      return;
    }

    const alreadyIn = itemsRef.current.some((i) => String(i) === idStr);

    if (alreadyIn) {
      setItems((prev) => prev.filter((i) => String(i) !== idStr));
      try {
        await sbFetch(
          `wishlist?user_email=eq.${encodeURIComponent(email)}&product_id=eq.${encodeURIComponent(idStr)}`,
          { method: "DELETE" }
        );
      } catch (err) {
        console.error("[Wishlist] delete error:", err.message);
        setItems((prev) => [...prev, idStr]); // rollback
      }
    } else {
      setItems((prev) => [...prev, idStr]);
      try {
        await sbFetch("wishlist", {
          method: "POST",
          body: JSON.stringify({ user_email: email, product_id: idStr }),
        });
      } catch (err) {
        console.error("[Wishlist] insert error:", err.message);
        setItems((prev) => prev.filter((i) => String(i) !== idStr)); // rollback
      }
    }
  };

  const isWishlisted = (id) => items.some((i) => String(i) === String(id));

  return (
    <WishlistContext.Provider value={{ items, toggleWishlist, isWishlisted, loading, orphansRemovedCount, dismissOrphansNotice }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
