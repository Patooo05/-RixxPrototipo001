import { useContext } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "./WishlistContext";
import { useCart } from "./CartContext";
import { ProductsContext } from "./ProductsContext";
import "../styles/Favorites.scss";

const formatPrice = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);

const HeartFilledIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const Favorites = () => {
  const { items, toggleWishlist } = useWishlist();
  const { add, openCart } = useCart();
  const { products } = useContext(ProductsContext);

  // Resolve full product objects from wishlist IDs
  const wishlistProducts = (products ?? []).filter((p) =>
    items.some((id) => String(id) === String(p.id))
  );

  const handleAddToCart = (product) => {
    add(product, 1);
    openCart();
  };

  return (
    <main className="favorites">
      <header className="favorites__header">
        <span className="favorites__eyebrow">Mi cuenta</span>
        <h1 className="favorites__title">
          Mis <em>favoritos</em>
        </h1>
      </header>

      {wishlistProducts.length === 0 ? (
        <div className="favorites__empty">
          <span className="favorites__empty-icon" aria-hidden="true">◆</span>
          <p className="favorites__empty-text">
            Todavía no guardaste ningún favorito.
          </p>
          <Link to="/productos" className="favorites__empty-link">
            Explorar colección
          </Link>
        </div>
      ) : (
        <section className="favorites__grid-section">
          <p className="favorites__count">
            {wishlistProducts.length}{" "}
            {wishlistProducts.length === 1 ? "producto" : "productos"}
          </p>
          <div className="favorites__grid">
            {wishlistProducts.map((product) => {
              const soldOut = product.stock <= 0;
              const hasDiscount =
                product.descuento &&
                new Date(product.descuento.hasta) > new Date();
              const discountedPrice = hasDiscount
                ? product.price * (1 - product.descuento.porcentaje / 100)
                : null;

              return (
                <article key={product.id} className="fav-card">
                  {/* Remove from wishlist */}
                  <button
                    className="fav-card__heart-btn fav-card__heart-btn--active"
                    onClick={() => toggleWishlist(product.id)}
                    aria-label="Quitar de favoritos"
                  >
                    <HeartFilledIcon />
                  </button>

                  {/* Sold-out badge */}
                  {soldOut && (
                    <span className="fav-card__badge">Agotado</span>
                  )}

                  {/* Image */}
                  <Link
                    to={`/producto/${product.id}`}
                    className="fav-card__img-link"
                  >
                    <div className="fav-card__image-wrap">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="fav-card__img"
                        />
                      ) : (
                        <div className="fav-card__img-placeholder" />
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="fav-card__info">
                    {product.category && (
                      <span className="fav-card__category">
                        {product.category}
                      </span>
                    )}
                    <Link
                      to={`/producto/${product.id}`}
                      className="fav-card__name-link"
                    >
                      <h3 className="fav-card__name">{product.name}</h3>
                    </Link>

                    {hasDiscount ? (
                      <div className="fav-card__pricing">
                        <span className="fav-card__price--original">
                          {formatPrice(product.price)}
                        </span>
                        <span className="fav-card__price fav-card__price--discount">
                          {formatPrice(discountedPrice)}
                        </span>
                      </div>
                    ) : (
                      <p className="fav-card__price">
                        {formatPrice(product.price)}
                      </p>
                    )}
                  </div>

                  {/* Add to cart */}
                  <button
                    className={`fav-card__cart-btn${soldOut ? " fav-card__cart-btn--disabled" : ""}`}
                    onClick={() => !soldOut && handleAddToCart(product)}
                    disabled={soldOut}
                  >
                    {soldOut ? "Agotado" : "Añadir al carrito"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default Favorites;
