import { createContext, useContext, useState, useEffect } from "react";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("rixx_wishlist");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("rixx_wishlist", JSON.stringify(items));
  }, [items]);

  const toggleWishlist = (id) => {
    setItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isWishlisted = (id) => items.includes(id);

  return (
    <WishlistContext.Provider value={{ items, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
