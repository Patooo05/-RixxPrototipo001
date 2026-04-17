import { useContext } from "react";
import { ProductsContext } from "../components/ProductsContext";
import ProductCard from "../components/ProductCard";
import "../styles/FeaturedProducts.scss";

const FeaturedProducts = () => {
  const { products } = useContext(ProductsContext);

  const featuredProducts = products.filter(
    (p) => p.featured === true && (!p.status || p.status === "activo")
  );

  return (
    <section className="featured-products fade-in-on-scroll">
      <header className="featured-header">
        <span className="featured-eyebrow">Selección editorial</span>
        <h2 className="featured-title">Productos Destacados</h2>
      </header>

      <div className="featured-grid">
        {featuredProducts.map((p, index) => (
          <ProductCard key={p.id} product={p} index={index} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
