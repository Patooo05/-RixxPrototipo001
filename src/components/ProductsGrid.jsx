import { useContext, useEffect } from "react";
import ProductCard from "./ProductCard";
import FilterBar from "./FilterBar";
import { ProductsContext } from "./ProductsContext";
import "../styles/ProductsGrid.scss";
import { fadeInOnScroll } from "../js/home";

const CATEGORY_DESCRIPTIONS = {
  Classic: "La elegancia de siempre, sin concesiones.",
  Sport: "Diseñado para el movimiento. Protección sin límites.",
  Luxury: "Craftsmanship. Lujo en cada detalle.",
};

const ProductsGrid = () => {
  const {
    products,
    filteredProducts,
    setSearch,
    setCategoryFilter,
    setPriceFilter,
    setSortOrder,
    categoryFilter,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
  } = useContext(ProductsContext);

  useEffect(() => { fadeInOnScroll(); }, []);

  const activeProducts = products.filter((p) => !p.status || p.status === "activo");
  const priceMax = activeProducts.length > 0
    ? Math.max(...activeProducts.map((p) => p.price))
    : 250;

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("Todos");
    setPriceFilter("Todos");
    setSortOrder("nuevo");
    setMinPrice(0);
    setMaxPrice(9999);
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

          {/* Price range slider */}
          <div className="price-range-slider">
            <p className="price-range-slider__label">
              Precio:&nbsp;
              <span className="price-range-slider__values">
                ${Math.round(minPrice).toLocaleString("es-UY")} — ${Math.round(maxPrice >= 9999 ? priceMax : maxPrice).toLocaleString("es-UY")}
              </span>
            </p>

            <div className="price-range-slider__track-wrap">
              <label className="price-range-slider__sr" htmlFor="range-min">Precio mínimo</label>
              <input
                id="range-min"
                type="range"
                className="price-range-slider__input price-range-slider__input--min"
                min={0}
                max={Math.ceil(priceMax)}
                value={Math.min(minPrice, maxPrice >= 9999 ? Math.ceil(priceMax) : maxPrice)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const currentMax = maxPrice >= 9999 ? Math.ceil(priceMax) : maxPrice;
                  setMinPrice(Math.min(val, currentMax));
                }}
              />

              <label className="price-range-slider__sr" htmlFor="range-max">Precio máximo</label>
              <input
                id="range-max"
                type="range"
                className="price-range-slider__input price-range-slider__input--max"
                min={0}
                max={Math.ceil(priceMax)}
                value={maxPrice >= 9999 ? Math.ceil(priceMax) : maxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxPrice(Math.max(val, minPrice));
                }}
              />
            </div>
          </div>
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

          {filteredProducts.length > 0 ? (
            <div className="products-grid__items">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="products-grid__empty">
              <h2>Sin resultados</h2>
              <p>Probá con otros filtros.</p>
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
