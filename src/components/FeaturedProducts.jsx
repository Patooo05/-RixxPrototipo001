import React, { useContext, useEffect, useState } from "react";
import { ProductsContext } from "../components/ProductsContext";
import { useCart } from "../components/CartContext";
import "../styles/FeaturedProducts.scss";

const FeaturedProducts = () => {
  const { products } = useContext(ProductsContext);
  const { add } = useCart();

  const [loading, setLoading] = useState(true);

  // SIMULAR LOADING
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const featuredProducts = products.filter((p) => p.featured === true);

  // ---- Parallax 3D ----
  const handleParallax = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    card.style.transform = `
      perspective(900px)
      rotateY(${x / 30}deg)
      rotateX(${-y / 30}deg)
      scale(1.06)
    `;
  };

  const resetParallax = (e) => {
    e.currentTarget.style.transform = "perspective(900px) scale(1)";
  };

  // ---- Spotlight ----
  const handleSpotlight = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100 + "%";
    const y = ((e.clientY - rect.top) / rect.height) * 100 + "%";

    card.style.setProperty("--x", x);
    card.style.setProperty("--y", y);
  };

  return (
    <section className="featured-products fade-in-on-scroll">
      <header className="featured-header">
        <h2 className="featured-title">Productos Destacados</h2>
        <p className="featured-subtitle">
          Seleccionados para mostrar lo mejor del diseño premium.
        </p>
      </header>

      <div className="featured-grid">

        {/* LOADING SKELETON */}
        {loading &&
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))}

        {!loading &&
          featuredProducts.map((p) => (
            <article
              key={p.id}
              className="featured-card"
              onMouseMove={(e) => {
                handleParallax(e);
                handleSpotlight(e);
              }}
              onMouseLeave={resetParallax}
            >
              <div className="featured-img-wrapper">
                <img src={p.image} alt={p.name} className="featured-img" />
              </div>

              <div className="featured-info">
                <h3 className="featured-name">{p.name}</h3>
                <span className="price">${p.price}</span>

                <button
                  className="featured-btn"
                  onClick={() => add(p, 1)}
                  disabled={p.stock <= 0}
                >
                  {p.stock <= 0 ? "Sin stock" : "Agregar al carrito"}
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
