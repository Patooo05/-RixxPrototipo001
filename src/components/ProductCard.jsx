import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import "../styles/ProductCard.scss";

const StarRating = ({ rating = 0 }) => (
  <div className="product-card__stars" aria-label={`${rating} de 5 estrellas`}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? "star star--filled" : "star star--empty"}>
        ★
      </span>
    ))}
  </div>
);

const ProductCard = ({ product, index = 0 }) => {
  const soldOut = product.stock <= 0;
  const cart = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!soldOut && cart) {
      cart.add(product, 1);
    }
  };

  return (
    <div
      className={`product-card ${soldOut ? "product-card--sold-out" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Badge: Nuevo o Agotado */}
      {product.isNew && !soldOut && (
        <span className="product-card__badge product-card__badge--new">Nuevo</span>
      )}
      {soldOut && (
        <span className="product-card__badge product-card__badge--sold-out">Agotado</span>
      )}

      <Link to={`/producto/${product.id}`} className="product-card__link">
        <div className="product-card__image-wrapper">
          {product.image ? (
            <img src={product.image} alt={product.name} loading="lazy" />
          ) : (
            <div className="product-card__image-placeholder" />
          )}
        </div>

        <div className="product-card__info">
          <h3 className="product-card__name">{product.name}</h3>
          <StarRating rating={product.rating} />
          <p className="product-card__price">${product.price} USD</p>
          {product.description && (
            <p className="product-card__desc">
              {product.description.length > 50
                ? product.description.slice(0, 50) + "…"
                : product.description}
            </p>
          )}
          {product.category && (
            <span className="product-card__category">{product.category}</span>
          )}
        </div>
      </Link>

      <button
        className={`product-card__btn ${soldOut ? "product-card__btn--disabled" : ""}`}
        onClick={handleAddToCart}
        disabled={soldOut}
      >
        {soldOut ? "Sin Stock" : "Agregar al Carrito"}
      </button>
    </div>
  );
};

export default ProductCard;
