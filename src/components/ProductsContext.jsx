import React, { createContext, useState } from "react";

export const ProductsContext = createContext();

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Vintage A",
      price: 120,
      image: "/assets/img/lente1.jpg",
      category: "Vintage",
      stock: 3,
      featured: false,
      isNew: false
    },
    {
      id: 2,
      name: "Vintage B",
      price: 150,
      image: "/assets/img/lente2.jpg",
      category: "Vintage",
      stock: 0,
      featured: true,
      isNew: false
    },
  ]);

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

  return (
    <ProductsContext.Provider
      value={{
        products,
        addProduct,
        removeProduct,
        toggleFeatured,
        updateProduct,
        markProductsExported
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};
