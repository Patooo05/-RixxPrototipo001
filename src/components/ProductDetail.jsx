import { useContext, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import QuantitySelector from "./QuantitySelector";
import { useCart } from "./CartContext";
import { useWishlist } from "./WishlistContext";
import RelatedProducts from "./RelatedProducts";
import ProductReviews from "./ProductReviews";
import "../styles/ProductDetail.scss";

const formatPrice = (price) => "$ " + Number(price).toLocaleString("es-UY");

// ── Icon helpers ────────────────────────────────────────────
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
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const ProductDetail = () => {
  const { id }       = useParams();
  const { products } = useContext(ProductsContext);
  const { add }      = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [qty, setQty] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const product = products.find((p) => String(p.id) === id);
  const isInactive = product && product.status && product.status !== "activo";

  if (!product || isInactive) return (
    <main className="product-detail product-detail--not-found">
      <p className="product-detail__not-found-msg">Producto no disponible.</p>
      <Link to="/productos" className="product-detail__back">← Volver</Link>
    </main>
  );

  const soldOut = product.stock <= 0;

  // ── Descuento activo ────────────────────────────────────────
  const hasDiscount =
    product.descuento &&
    new Date(product.descuento.hasta) > new Date();

  const precioConDescuento = hasDiscount
    ? product.price * (1 - product.descuento.porcentaje / 100)
    : null;

  // ── Imagen principal (soporta array images) ─────────────────
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  const mainImage = images[0] ?? null;

  const wishlisted = isWishlisted(product.id);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url: window.location.href });
      } catch {
        // User cancelled or error — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <main className="product-detail">
      {/* ── Zoom overlay ────────────────────────────────────── */}
      {zoomOpen && (
        <div
          className="img-zoom-overlay"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          {mainImage && (
            <img
              src={mainImage}
              alt={product.name}
              className="img-zoom-overlay__img"
            />
          )}
        </div>
      )}

      <div className="product-detail__container">

        {/* ── Galería ── */}
        <div className="product-detail__gallery">
          <div className="main-image">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="product-detail__main-img"
                onClick={() => setZoomOpen(true)}
              />
            ) : (
              <div className="main-image__placeholder" />
            )}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="product-detail__info">

          {product.category && (
            <span className="product-detail__category">{product.category}</span>
          )}

          <h1 className="product-detail__name">
            <em>{product.name}</em>
          </h1>

          {/* ── Precio ── */}
          {hasDiscount ? (
            <div className="product-detail__price-group">
              <span className="product-detail__price--original">
                {formatPrice(product.price)}
              </span>
              <span className="product-detail__price--discount">
                {formatPrice(precioConDescuento)}
              </span>
              <span className="discount-badge">
                {product.descuento.porcentaje}% OFF
              </span>
            </div>
          ) : (
            <p className="product-detail__price">{formatPrice(product.price)}</p>
          )}

          {/* ── Wishlist + Share ── */}
          <div className="product-detail__actions-row">
            <button
              className={`product-detail__wish-btn${wishlisted ? " product-detail__wish-btn--active" : ""}`}
              onClick={() => toggleWishlist(product.id)}
              aria-label={wishlisted ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <HeartIcon filled={wishlisted} />
              <span>{wishlisted ? "Guardado" : "Favoritos"}</span>
            </button>

            <button
              className="product-detail__share-btn"
              onClick={handleShare}
              aria-label="Compartir producto"
            >
              <ShareIcon />
              <span>{copied ? "¡Copiado!" : "Compartir"}</span>
            </button>
          </div>

          {product.description && (
            <p className="product-detail__description">{product.description}</p>
          )}

          {product.characteristics?.length > 0 && (
            <ul className="product-detail__chars">
              {product.characteristics.map((c, i) => (
                <li key={i} className="product-detail__char">{c}</li>
              ))}
            </ul>
          )}

          <div className={`product-detail__stock${soldOut ? " product-detail__stock--out" : ""}`}>
            {soldOut ? "Agotado" : `${product.stock} unidades disponibles`}
          </div>

          {!soldOut && (
            <>
              <QuantitySelector value={qty} onChange={setQty} max={product.stock} />
              {product.stock <= 3 && product.stock > 0 && (
                <p className="stock-countdown">
                  Solo quedan {product.stock}{" "}
                  {product.stock === 1 ? "unidad" : "unidades"} disponibles
                </p>
              )}
            </>
          )}

          {soldOut ? (
            <button className="product-detail__sold-out" disabled>Agotado</button>
          ) : (
            <button
              className="product-detail__add-btn primary-btn"
              onClick={() => add(product, qty)}
            >
              Añadir al carrito
            </button>
          )}

          <Link to="/productos" className="product-detail__back">
            ← Volver a la colección
          </Link>

        </div>
      </div>

      {/* ── Reseñas ── */}
      <ProductReviews productId={String(product.id)} />

      {/* ── Productos relacionados ── */}
      <RelatedProducts currentProductId={product.id} category={product.category} />
    </main>
  );
};

export default ProductDetail;
