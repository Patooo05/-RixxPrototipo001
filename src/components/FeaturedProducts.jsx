import { useContext } from "react";
import { ProductsContext } from "../components/ProductsContext";
import { useCart } from "../components/CartContext";
import "../styles/FeaturedProducts.scss";

// Formato de precio luxury: $ 2.400
const formatPrice = (price) =>
  "$ " + Number(price).toLocaleString("es-UY");

const FeaturedProducts = () => {
  const { products } = useContext(ProductsContext);
  const { add, openCart } = useCart();

  const featuredProducts = products.filter(
    (p) => p.featured === true && (!p.status || p.status === "activo")
  );

  const handleParallax = (e) => {
    const card = e.currentTarget;
    const rect  = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width  / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    card.style.transform = `perspective(900px) rotateY(${x / 35}deg) rotateX(${-y / 35}deg) scale(1.03)`;
  };

  const resetParallax = (e) => {
    e.currentTarget.style.transform = "perspective(900px) scale(1)";
  };

  const handleSpotlight = (e) => {
    const card = e.currentTarget;
    const rect  = card.getBoundingClientRect();
    card.style.setProperty("--x", ((e.clientX - rect.left) / rect.width  * 100) + "%");
    card.style.setProperty("--y", ((e.clientY - rect.top)  / rect.height * 100) + "%");
  };

  return (
    <section className="featured-products fade-in-on-scroll">
      <header className="featured-header">
        <span className="featured-eyebrow">Selección editorial</span>
        <h2 className="featured-title">Productos Destacados</h2>
      </header>

      <div className="featured-grid">
        {featuredProducts.map((p, index) => (
          <article
            key={p.id}
            className={`featured-card${index === 0 ? " featured-card--hero" : ""}`}
            onMouseMove={(e) => { handleParallax(e); handleSpotlight(e); }}
            onMouseLeave={resetParallax}
          >
            <div className="featured-img-wrapper">
              <img src={p.image} alt={p.name} className="featured-img" />
            </div>
            <div className="featured-info">
              <h3 className="featured-name">{p.name}</h3>
              <span className="price">{formatPrice(p.price)}</span>
              <button
                className="featured-btn primary-btn"
                onClick={() => { add(p, 1); openCart(); }}
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
