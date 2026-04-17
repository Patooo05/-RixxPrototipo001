import React, { useContext } from "react";
import { ProductsContext } from "./ProductsContext";
import "../styles/FilterBar.scss";

const CATEGORIES = ["Todos", "Rixx 001", "Rixx 002", "Rixx 003"];

const FilterBar = () => {
  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
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
          <span className="filter-bar__label">Colección</span>
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

      </div>
    </div>
  );
};

export default FilterBar;
