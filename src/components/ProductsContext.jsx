import React, { createContext, useState, useMemo } from "react";

export const ProductsContext = createContext();

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Vintage A",
    price: 120,
    image: "/assets/img/lente1.jpg",
    category: "Classic",
    stock: 3,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Diseño clásico atemporal con montura fina",
    characteristics: ["Montura fina", "UV400", "Ligeros"]
  },
  {
    id: 2,
    name: "Vintage B",
    price: 150,
    image: "/assets/img/lente2.jpg",
    category: "Classic",
    stock: 0,
    featured: true,
    isNew: false,
    rating: 5,
    description: "Lentes vintage de edición limitada premium",
    characteristics: ["Edición limitada", "Clásico", "Premium"]
  },
  {
    id: 3,
    name: "Urban Shield",
    price: 99,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Urban+Shield",
    category: "Sport",
    stock: 5,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Resistentes y ligeros para el día a día urbano",
    characteristics: ["Anti-impacto", "Ligeros", "Resistentes"]
  },
  {
    id: 4,
    name: "Night Vision",
    price: 135,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Night+Vision",
    category: "Sport",
    stock: 2,
    featured: true,
    isNew: false,
    rating: 4,
    description: "Alto contraste para uso nocturno y deportivo",
    characteristics: ["Alto contraste", "Anti-reflejo", "Sport"]
  },
  {
    id: 5,
    name: "Gold Frame",
    price: 175,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Gold+Frame",
    category: "Luxury",
    stock: 4,
    featured: true,
    isNew: false,
    rating: 5,
    description: "Montura dorada con cristales de lujo premium",
    characteristics: ["Montura dorada", "Cristales premium", "Lujo"]
  },
  {
    id: 6,
    name: "Classic Elite",
    price: 145,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Classic+Elite",
    category: "Classic",
    stock: 6,
    featured: false,
    isNew: false,
    rating: 4,
    description: "Elegancia clásica para el estilo contemporáneo",
    characteristics: ["Elegante", "Clásico", "Versátil"]
  },
  {
    id: 7,
    name: "Titanium Edge Pro",
    price: 189.99,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Titanium+Edge+Pro",
    category: "Sport",
    stock: 8,
    featured: true,
    isNew: true,
    rating: 5,
    description: "Lentes deportivos anti-reflejo de titanio puro",
    characteristics: ["Anti-reflejo", "Titanio", "Ultra-ligeros"]
  },
  {
    id: 8,
    name: "Aviator Luxe Retro",
    price: 159.99,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Aviator+Retro",
    category: "Classic",
    stock: 5,
    featured: true,
    isNew: true,
    rating: 5,
    description: "Diseño vintage clásico inspirado en los años 70s",
    characteristics: ["Vintage", "Clásico", "Elegante"]
  },
  {
    id: 9,
    name: "Crystal Vision Premium",
    price: 199.99,
    image: "https://via.placeholder.com/400x400/0a0a0a/d4af37?text=Crystal+Vision",
    category: "Luxury",
    stock: 3,
    featured: true,
    isNew: true,
    rating: 5,
    description: "Cristales alemanes con montura dorada de lujo",
    characteristics: ["Premium", "Dorado", "Cristales alemanes"]
  }
];

export const ProductsProvider = ({ children }) => {
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  // Filter / search / sort state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [priceFilter, setPriceFilter] = useState("Todos");
  const [sortOrder, setSortOrder] = useState("nuevo");

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search (name + description, case-insensitive)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Category
    if (categoryFilter !== "Todos") {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Price range
    if (priceFilter === "<100") result = result.filter(p => p.price < 100);
    else if (priceFilter === "100-150") result = result.filter(p => p.price >= 100 && p.price <= 150);
    else if (priceFilter === "150-200") result = result.filter(p => p.price > 150 && p.price <= 200);
    else if (priceFilter === ">200") result = result.filter(p => p.price > 200);

    // Sort
    if (sortOrder === "precio-asc") result.sort((a, b) => a.price - b.price);
    else if (sortOrder === "precio-desc") result.sort((a, b) => b.price - a.price);
    else if (sortOrder === "popular") result.sort((a, b) => b.rating - a.rating);
    else {
      // "nuevo" — isNew first, then by id desc
      result.sort((a, b) => {
        if (b.isNew !== a.isNew) return b.isNew ? 1 : -1;
        return b.id - a.id;
      });
    }

    return result;
  }, [products, search, categoryFilter, priceFilter, sortOrder]);

  const addProduct = (product) => {
    if (!product.name || !product.price) return;
    setProducts(prev => [
      ...prev,
      { ...product, id: Date.now(), stock: product.stock ?? 1, featured: product.featured ?? false, isNew: true }
    ]);
  };

  const removeProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleFeatured = (id) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, featured: !p.featured } : p))
    );
  };

  const updateProduct = (updatedProduct) => {
    setProducts(prev =>
      prev.map(p => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
    );
  };

  const markProductsExported = () => {
    setProducts(prev =>
      prev.map(p => p.isNew ? { ...p, isNew: false } : p)
    );
  };

  const updateStock = (id, newStock) => {
    const qty = Number(newStock);
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, stock: qty } : p)
    );
    setHistory(prev => [
      ...prev,
      { productId: id, type: "edit", quantity: qty, date: new Date().toLocaleString() }
    ]);
  };

  const registerSale = (productId, quantity) => {
    const id = Number(productId);
    const qty = Number(quantity);
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, stock: Math.max(0, p.stock - qty) };
      })
    );
    setHistory(prev => [
      ...prev,
      { productId: id, type: "sale", quantity: qty, date: new Date().toLocaleString() }
    ]);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        filteredProducts,
        addProduct,
        removeProduct,
        toggleFeatured,
        updateProduct,
        markProductsExported,
        updateStock,
        registerSale,
        history,
        search, setSearch,
        categoryFilter, setCategoryFilter,
        priceFilter, setPriceFilter,
        sortOrder, setSortOrder
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};
