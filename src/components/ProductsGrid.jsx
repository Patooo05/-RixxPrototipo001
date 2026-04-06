import React, { useContext, useEffect } from "react";
import ProductCard from "./ProductCard";
import { ProductsContext } from "./ProductsContext";
import ProductsBanner from "./ProductsBanner";
import "../styles/ProductsGrid.scss";
import "../styles/Global.scss";
import { fadeInOnScroll } from "../js/home";



const ProductsGrid = () => {
  const { products } = useContext(ProductsContext);

  useEffect(() => {
    fadeInOnScroll();
  }, []);

  return (
    <main className="products-grid">

      {/* Banner */}


      {/* Título y descripción de la colección */}
      <header className="products-grid__header">
        <h1 className="products-grid__title">Colección Rixx</h1>
        <p className="products-grid__description">
          Lentes seleccionados con precisión. Diseño atemporal,
          materiales premium y producción limitada por drops.
        </p>
      </header>

      {/* Grid de productos */}
      <section className="products-grid__content">
        <div className="products-grid__items">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="products-grid__empty">
              <h2>Sin productos disponibles</h2>
              <p>Estamos preparando el próximo drop. Vuelve pronto.</p>
            </div>
          )}
        </div>
      </section>

    </main>
  );
};

export default ProductsGrid;
