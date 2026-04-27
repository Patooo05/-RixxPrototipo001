// Shared raw-fetch helper — bypasses Supabase JS client auth blocking/timeouts.
// Used by ProductsContext, OrdersContext, WishlistContext.

export const sbUrl = () => import.meta.env.VITE_SUPABASE_URL;
export const sbKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sbFetch = async (path, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${sbUrl()}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey:          sbKey(),
        Authorization:   `Bearer ${sbKey()}`,
        "Content-Type":  "application/json",
        Prefer:          "return=representation",
        ...(options.headers || {}),
      },
    });
    clearTimeout(tid);
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
};
