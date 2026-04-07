import React, { useContext, useEffect } from "react";
import ProductCard from "./ProductCard";
import FilterBar from "./FilterBar";
import { ProductsContext } from "./ProductsContext";
import "../styles/ProductsGrid.scss";
import "../styles/Global.scss";
import { fadeInOnScroll } from "../js/home";

const ProductsGrid = () => {
  const {
    products,
    filteredProducts,
    setSearch,
    setCategoryFilter,
    setPriceFilter,
    setSortOrder
  } = useContext(ProductsContext);

  useEffect(() => {
    fadeInOnScroll();
  }, []);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("Todos");
    setPriceFilter("Todos");
    setSortOrder("nuevo");
  };

  return (
    <main className="products-grid">

      <header className="products-grid__header">
        <h1 className="products-grid__title">Colección Rixx</h1>
        <p className="products-grid__description">
          Lentes seleccionados con precisión. Diseño atemporal,
          materiales premium y producción limitada por drops.
        </p>
      </header>

      <div className="products-grid__body">

        <aside className="products-grid__sidebar">
          <FilterBar />
        </aside>

        <section className="products-grid__content">
          <p className="products-grid__counter">
            Mostrando <strong>{filteredProducts.length}</strong> de{" "}
            <strong>{products.length}</strong> productos
          </p>

          {filteredProducts.length > 0 ? (
            <div className="products-grid__items">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="products-grid__empty">
              <h2>No encontramos lentes que coincidan</h2>
              <p>Prueba con otros filtros o términos de búsqueda.</p>
              <button className="products-grid__empty-btn" onClick={handleClearFilters}>
                Ver todos los productos
              </button>
            </div>
          )}
        </section>

      </div>

    </main>
  );
};

export default ProductsGrid;
