import { useContext } from "react";
import { ProductsContext } from "../components/ProductsContext";
import ProductCard from "../components/ProductCard";
import { SkeletonCard } from "../components/ProductSkeleton";
import "../styles/FeaturedProducts.scss";
import "../styles/ProductSkeleton.scss";

const FeaturedProducts = () => {
  const { products, loading } = useContext(ProductsContext);

  const featuredProducts = products.filter(
    (p) => p.featured === true && (!p.status || p.status === "activo")
  );

  if (!loading && featuredProducts.length === 0) return null;

  return (
    <section className="featured-products fade-in-on-scroll">
      <header className="featured-header">
        <span className="featured-eyebrow">Selección editorial</span>
        <h2 className="featured-title">Productos Destacados</h2>
      </header>

      <div className="featured-grid">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
          : featuredProducts.map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} />
            ))
        }
      </div>
    </section>
  );
};

export default FeaturedProducts;
