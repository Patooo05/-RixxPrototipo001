import { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

const ReviewsCtx = createContext(null);

const DEMO_REVIEWS = [
  { id: "d1", author_name: "Martina R.", rating: 5, comment: "Los mejores lentes que usé en mi vida. La calidad se siente desde el primer momento.", product_name: "Nova", approved: true, source: "customer", created_at: new Date().toISOString() },
  { id: "d2", author_name: "Lucas M.", rating: 5, comment: "Diseño increíble, materiales de primera. Recibí muchos comentarios desde que los tengo.", product_name: "Core", approved: true, source: "customer", created_at: new Date().toISOString() },
  { id: "d3", author_name: "Valentina S.", rating: 5, comment: "Compré el Vector y quedé enamorada. El empaque es de lujo y la atención fue perfecta.", product_name: "Vector", approved: true, source: "admin", created_at: new Date().toISOString() },
];

export const ReviewsProvider = ({ children }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(isSupabaseEnabled);

  const fetchReviews = async () => {
    if (!isSupabaseEnabled) { setReviews(DEMO_REVIEWS); setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (error) { setReviews(DEMO_REVIEWS); }
      else { setReviews(data ?? []); }
    } catch { setReviews(DEMO_REVIEWS); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const addReview = async (review) => {
    const newReview = {
      author_name: review.author_name,
      rating: review.rating,
      comment: review.comment,
      product_name: review.product_name || null,
      approved: review.approved ?? true,
      source: review.source ?? "admin",
    };
    if (!isSupabaseEnabled) {
      setReviews(prev => [{ ...newReview, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
      return;
    }
    const { data, error } = await supabase.from("reviews").insert(newReview).select().single();
    if (!error && data) setReviews(prev => [data, ...prev]);
  };

  const updateReview = async (id, changes) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
    if (isSupabaseEnabled) await supabase.from("reviews").update(changes).eq("id", id);
  };

  const deleteReview = async (id) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    if (isSupabaseEnabled) await supabase.from("reviews").delete().eq("id", id);
  };

  const toggleApproved = (id) => {
    const r = reviews.find(r => r.id === id);
    if (r) updateReview(id, { approved: !r.approved });
  };

  return (
    <ReviewsCtx.Provider value={{ reviews, loading, addReview, updateReview, deleteReview, toggleApproved }}>
      {children}
    </ReviewsCtx.Provider>
  );
};

export const useReviews = () => useContext(ReviewsCtx);
