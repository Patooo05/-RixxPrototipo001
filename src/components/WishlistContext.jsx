import { createContext, useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

const WishlistContext = createContext(null);

// ─── helpers ──────────────────────────────────────────────────────────────────

const LS_KEY = "rixx_wishlist";

const readLocalStorage = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalStorage = (items) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or private-browsing restriction — silently ignore
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WishlistProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const email = currentUser?.email ?? null;

  // True when Supabase is available AND a user is logged in
  const useSupabase = isSupabaseEnabled && !!email;

  // items: array of product IDs (strings when Supabase, numbers/strings when localStorage)
  const [items, setItems] = useState(readLocalStorage);
  const [loading, setLoading] = useState(false);

  // Keep a ref to the latest items so async callbacks never close over stale state
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Sync with Supabase on login / user change ──────────────────────────────
  useEffect(() => {
    if (!useSupabase) {
      // User just logged out: clear wishlist in memory
      if (!email) {
        setItems([]);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from("wishlist")
      .select("product_id")
      .eq("user_email", email)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[Wishlist] fetch error:", error.message);
        } else {
          setItems((data ?? []).map((row) => row.product_id));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [useSupabase, email]);

  // ── Persist to localStorage when NOT using Supabase ───────────────────────
  useEffect(() => {
    if (!useSupabase) {
      writeLocalStorage(items);
    }
  }, [items, useSupabase]);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleWishlist = async (productId) => {
    const id = productId; // keep original type for localStorage
    const idStr = String(productId); // always string for Supabase comparison

    if (!useSupabase) {
      // localStorage path: compare using String() to handle mixed number/string ids
      setItems((prev) =>
        prev.some((i) => String(i) === idStr)
          ? prev.filter((i) => String(i) !== idStr)
          : [...prev, id]
      );
      return;
    }

    // Supabase path — optimistic update
    const alreadyIn = itemsRef.current.some((i) => String(i) === idStr);

    if (alreadyIn) {
      // Optimistic remove
      setItems((prev) => prev.filter((i) => String(i) !== idStr));

      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_email", email)
        .eq("product_id", idStr);

      if (error) {
        console.error("[Wishlist] delete error:", error.message);
        // Rollback
        setItems((prev) => [...prev, idStr]);
      }
    } else {
      // Optimistic add
      setItems((prev) => [...prev, idStr]);

      const { error } = await supabase
        .from("wishlist")
        .insert({ user_email: email, product_id: idStr });

      if (error) {
        console.error("[Wishlist] insert error:", error.message);
        // Rollback
        setItems((prev) => prev.filter((i) => String(i) !== idStr));
      }
    }
  };

  // ── isWishlisted ───────────────────────────────────────────────────────────
  // Compares using String() to handle UUID strings vs numeric local IDs
  const isWishlisted = (id) => items.some((i) => String(i) === String(id));

  return (
    <WishlistContext.Provider value={{ items, toggleWishlist, isWishlisted, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
