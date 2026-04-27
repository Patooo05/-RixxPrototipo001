import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { useWishlist } from "./WishlistContext";
import QuickViewModal from "./QuickViewModal";
import { prefetchRoute } from "../hooks/usePrefetch.js";
import "../styles/ProductCard.scss";

const formatPrice = (price) => "$ " + Number(price).toLocaleString("es-UY");

const IconShield = () => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 3v6c0 5-3.5 9.74-8 11C7.5 20.74 4 16 4 11V5l8-3z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IconPackage = () => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconTag = () => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconShare = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconWhatsApp = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const IconInstagram = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

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
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    if (!shareOpen) return;
    const handleOutside = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [shareOpen]);

  const wishlisted = isWishlisted(product.id);

  const hasDiscount =
    product.descuento && new Date(product.descuento.hasta) > new Date();
  const precioDesc = hasDiscount
    ? product.price * (1 - product.descuento.porcentaje / 100)
    : null;

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    if (!soldOut && cart) {
      cart.add(product, 1);
      cart.openCart();
    }
  }, [soldOut, cart, product]);

  const handleWishlist = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  }, [toggleWishlist, product.id]);

  const handleQuickView = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  }, []);

  const productUrl = `${window.location.origin}/producto/${product.id}`;
  const shareText = `Mirá estos lentes: ${product.name} — ${productUrl}`;

  const handleShareToggle = useCallback((e) => {
    e.preventDefault();
    setShareOpen((o) => !o);
  }, []);

  const handleShareWhatsApp = useCallback((e) => {
    e.preventDefault();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
    setShareOpen(false);
  }, [shareText]);

  const handleShareInstagram = useCallback(async (e) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: productUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
    setShareOpen(false);
  }, [product.name, shareText, productUrl]);

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
  }, []);

  return (
    <>
      <article
        className={`product-card${soldOut ? " product-card--sold-out" : ""}`}
        style={{ animationDelay: `${Math.min(index * 0.05, 0.2)}s` }}
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
        <Link to={`/producto/${product.id}`} className="product-card__img-link" onMouseEnter={() => prefetchRoute('/producto')}>
          <div className={`product-card__image-wrapper${!imgLoaded && product.image ? " product-card__image-skeleton" : ""}`}>
            {product.image
              ? <img
                  src={product.image}
                  alt={product.name}
                  width={400}
                  height={533}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  draggable="false"
                  onLoad={handleImgLoad}
                  className={`product-card__img${imgLoaded ? " product-card__img--loaded" : ""}`}
                  style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s ease" }}
                />
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
          <Link to={`/producto/${product.id}`} className="product-card__name-link" onMouseEnter={() => prefetchRoute('/producto')}>
            <h3 className="product-card__name">{product.name}</h3>
          </Link>

          {/* Descripción */}
          {product.description && (
            <p className="product-card__description">{product.description}</p>
          )}

          {/* Precio con o sin descuento */}
          {hasDiscount ? (
            <div className="product-card__pricing">
              <span className="product-card__price-original">{formatPrice(product.price)}</span>
              <span className="product-card__price product-card__price--discount">{formatPrice(precioDesc)}</span>
            </div>
          ) : (
            <p className="product-card__price">{formatPrice(product.price)}</p>
          )}

          {/* Benefits */}
          <ul className="product-card__benefits">
            <li><IconShield /><span>Garantía 30 días</span></li>
            <li><IconPackage /><span>Envío gratis x2</span></li>
            <li><IconTag /><span>20% off registrándote</span></li>
          </ul>

          {/* Share */}
          <div className="product-card__share" ref={shareRef}>
            <button
              className="product-card__share-btn"
              onClick={handleShareToggle}
              aria-label="Compartir producto"
              aria-expanded={shareOpen}
            >
              <IconShare />
              <span>Compartir</span>
            </button>

            {shareOpen && (
              <div className="product-card__share-menu">
                <button className="product-card__share-option product-card__share-option--wa" onClick={handleShareWhatsApp}>
                  <IconWhatsApp />
                  <span>WhatsApp</span>
                </button>
                <button className="product-card__share-option product-card__share-option--ig" onClick={handleShareInstagram}>
                  <IconInstagram />
                  <span>Instagram</span>
                </button>
              </div>
            )}

            {copied && (
              <span className="product-card__share-copied">¡Link copiado!</span>
            )}
          </div>
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

export default memo(ProductCard, (prev, next) => {
  return (
    prev.product?.id === next.product?.id &&
    prev.product?.stock === next.product?.stock &&
    prev.product?.price === next.product?.price &&
    prev.product?.descuento === next.product?.descuento &&
    prev.isWishlisted === next.isWishlisted
  );
});
