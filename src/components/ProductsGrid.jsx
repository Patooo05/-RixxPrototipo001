import { useContext, useEffect } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import ProductCard from "./ProductCard";
import FilterBar from "./FilterBar";
import ProductSkeleton from "./ProductSkeleton";
import { ProductsContext } from "./ProductsContext";
import "../styles/ProductsGrid.scss";
import { fadeInOnScroll } from "../js/home";

const CATEGORY_DESCRIPTIONS = {
  "Rixx 001": "El punto de partida. Líneas limpias, esencia pura.",
  "Rixx 002": "Una evolución del diseño. Forma y función en equilibrio.",
  "Rixx 003": "La expresión más sofisticada de la marca.",
};

const ProductsGrid = () => {
  usePageTitle("Colección");
  const {
    filteredProducts,
    loading,
    setSearch,
    setCategoryFilter,
    categoryFilter,
  } = useContext(ProductsContext);

  useEffect(() => { fadeInOnScroll(); }, []);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("Todos");
  };

  const bannerDescription =
    CATEGORY_DESCRIPTIONS[categoryFilter] || "Explorá nuestra colección.";

  return (
    <main className="products-grid">

      <header className="products-grid__header">
        <span className="products-grid__eyebrow">Rixx — Temporada 2025</span>
        <h1 className="products-grid__title"><em>Colección</em> Completa</h1>
        <p className="products-grid__description">
          Diseño atemporal, materiales premium y producción limitada.
        </p>
      </header>

      <div className="products-grid__body">

        <aside className="products-grid__sidebar">
          <FilterBar />
        </aside>

        <section className="products-grid__content">

          {/* Collection banner */}
          {categoryFilter !== "Todos" && (
            <div className="collection-banner">
              <h2 className="collection-banner__title">{categoryFilter}</h2>
              <p className="collection-banner__description">{bannerDescription}</p>
            </div>
          )}

          <p className="products-grid__counter">
            {filteredProducts.length} {filteredProducts.length === 1 ? "modelo" : "modelos"}
          </p>

          {loading ? (
            <ProductSkeleton count={8} />
          ) : filteredProducts.length > 0 ? (
            <div className="products-grid__items">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : categoryFilter !== "Todos" ? (
            <div className="products-grid__empty products-grid__empty--collection">
              <span className="products-grid__empty-eyebrow">Próximamente</span>
              <h2>Esta colección está siendo curada.</h2>
              <p>
                Los modelos de <strong>{categoryFilter}</strong> están en camino.<br />
                Cada pieza pasa por un proceso de selección riguroso antes de llegar a vos.<br />
                Estate atento — lo mejor está por llegar.
              </p>
              <button className="products-grid__empty-btn" onClick={handleClearFilters}>
                Ver toda la colección
              </button>
            </div>
          ) : (
            <div className="products-grid__empty">
              <h2>Sin resultados</h2>
              <p>Probá con otro término de búsqueda.</p>
              <button className="products-grid__empty-btn" onClick={handleClearFilters}>
                Ver todos
              </button>
            </div>
          )}
        </section>

      </div>

    </main>
  );
};

export default ProductsGrid;
