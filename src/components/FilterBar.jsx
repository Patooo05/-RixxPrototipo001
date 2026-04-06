import React, { useContext } from "react";
import { ProductsContext } from "./ProductsContext";
import "../styles/FilterBar.scss";

const CATEGORIES = ["Todos", "Sport", "Classic", "Luxury"];
const PRICE_RANGES = [
  { label: "Todos",       value: "Todos"   },
  { label: "< $100",      value: "<100"    },
  { label: "$100 – $150", value: "100-150" },
  { label: "$150 – $200", value: "150-200" },
  { label: "> $200",      value: ">200"    },
];

const FilterBar = () => {
  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    priceFilter, setPriceFilter,
    sortOrder, setSortOrder
  } = useContext(ProductsContext);

  return (
    <div className="filter-bar">

      {/* Búsqueda */}
      <div className="filter-bar__search">
        <input
          type="text"
          placeholder="Buscar lentes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="filter-bar__input"
          aria-label="Buscar productos"
        />
        {search && (
          <button
            className="filter-bar__clear"
            onClick={() => setSearch("")}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-bar__controls">

        {/* Categoría */}
        <div className="filter-bar__group">
          <span className="filter-bar__label">Categoría</span>
          <div className="filter-bar__buttons">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-bar__btn ${categoryFilter === cat ? "filter-bar__btn--active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Precio */}
        <div className="filter-bar__group">
          <span className="filter-bar__label">Precio</span>
          <div className="filter-bar__buttons">
            {PRICE_RANGES.map(r => (
              <button
                key={r.value}
                className={`filter-bar__btn ${priceFilter === r.value ? "filter-bar__btn--active" : ""}`}
                onClick={() => setPriceFilter(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ordenamiento */}
        <div className="filter-bar__group">
          <span className="filter-bar__label">Ordenar</span>
          <select
            className="filter-bar__select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            aria-label="Ordenar productos"
          >
            <option value="nuevo">Más nuevo</option>
            <option value="precio-asc">Precio: Menor a Mayor</option>
            <option value="precio-desc">Precio: Mayor a Menor</option>
            <option value="popular">Más popular</option>
          </select>
        </div>

      </div>
    </div>
  );
};

export default FilterBar;
