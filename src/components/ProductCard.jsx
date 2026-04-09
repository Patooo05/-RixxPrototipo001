import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { useWishlist } from "./WishlistContext";
import QuickViewModal from "./QuickViewModal";
import "../styles/ProductCard.scss";

const formatPrice = (price) => "$ " + Number(price).toLocaleString("es-UY");

const HeartIcon = ({ filled }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ProductCard = ({ product, index = 0 }) => {
  const soldOut = product.stock <= 0;
  const cart = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const wishlisted = isWishlisted(product.id);

  const hasDiscount =
    product.descuento && new Date(product.descuento.hasta) > new Date();
  const precioDesc = hasDiscount
    ? product.price * (1 - product.descuento.porcentaje / 100)
    : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!soldOut && cart) {
      cart.add(product, 1);
      cart.openCart();
    }
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <article
        className={`product-card${soldOut ? " product-card--sold-out" : ""}`}
        style={{ animationDelay: `${index * 0.06}s` }}
      >
        {/* Badge */}
        {product.isNew && !soldOut && (
          <span className="product-card__badge">Nuevo</span>
        )}
        {soldOut && (
          <span className="product-card__badge product-card__badge--out">Agotado</span>
        )}

        {/* Botón wishlist */}
        <button
          className={`product-card__wishlist-btn${wishlisted ? " product-card__wishlist-btn--active" : ""}`}
          onClick={handleWishlist}
          aria-label={wishlisted ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <HeartIcon filled={wishlisted} />
        </button>

        {/* Imagen */}
        <Link to={`/producto/${product.id}`} className="product-card__img-link">
          <div className="product-card__image-wrapper">
            {product.image
              ? <img src={product.image} alt={product.name} loading="lazy" />
              : <div className="product-card__image-placeholder" />
            }

            {/* Overlay quick view */}
            <div className="product-card__quick-overlay">
              <button
                className="product-card__quick-btn"
                onClick={handleQuickView}
              >
                Vista rápida
              </button>
            </div>
          </div>
        </Link>

        {/* Info */}
        <div className="product-card__info">
          {product.category && (
            <span className="product-card__category">{product.category}</span>
          )}
          <Link to={`/producto/${product.id}`} className="product-card__name-link">
            <h3 className="product-card__name">{product.name}</h3>
          </Link>

          {/* Precio con o sin descuento */}
          {hasDiscount ? (
            <div className="product-card__pricing">
              <span className="product-card__price-original">{formatPrice(product.price)}</span>
              <span className="product-card__price product-card__price--discount">{formatPrice(precioDesc)}</span>
            </div>
          ) : (
            <p className="product-card__price">{formatPrice(product.price)}</p>
          )}
        </div>

        {/* CTA */}
        <button
          className={`product-card__btn${soldOut ? " product-card__btn--disabled" : ""}`}
          onClick={handleAddToCart}
          disabled={soldOut}
        >
          {soldOut ? "Agotado" : "Agregar al carrito"}
        </button>
      </article>

      {/* Quick View Modal */}
      {quickViewOpen && (
        <QuickViewModal
          product={product}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
