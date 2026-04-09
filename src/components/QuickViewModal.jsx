import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import "../styles/QuickViewModal.scss";

const formatPrice = (price) => "$ " + Number(price).toLocaleString("es-UY");

const QuickViewModal = ({ product, onClose }) => {
  const cart = useCart();

  const hasDiscount =
    product.descuento && new Date(product.descuento.hasta) > new Date();
  const precioDesc = hasDiscount
    ? product.price * (1 - product.descuento.porcentaje / 100)
    : null;

  const handleAddToCart = () => {
    if (cart && product.stock > 0) {
      cart.add(product, 1);
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="quick-view-overlay" onClick={handleOverlayClick}>
      <div className="quick-view-panel">
        <button className="quick-view-panel__close" onClick={onClose} aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        <div className="quick-view-panel__image">
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div className="quick-view-panel__image-placeholder" />
          )}
        </div>

        <div className="quick-view-panel__info">
          {product.category && (
            <span className="quick-view-panel__category">{product.category}</span>
          )}

          <h2 className="quick-view-panel__name">{product.name}</h2>

          <div className="quick-view-panel__pricing">
            {hasDiscount ? (
              <>
                <span className="quick-view-panel__price-original">
                  {formatPrice(product.price)}
                </span>
                <span className="quick-view-panel__price-discount">
                  {formatPrice(precioDesc)}
                </span>
                <span className="quick-view-panel__discount-badge">
                  -{product.descuento.porcentaje}%
                </span>
              </>
            ) : (
              <span className="quick-view-panel__price">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="quick-view-panel__description">{product.description}</p>
          )}

          {product.characteristics && product.characteristics.length > 0 && (
            <ul className="quick-view-panel__characteristics">
              {product.characteristics.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <div className="quick-view-panel__actions">
            <button
              className={`quick-view-panel__btn-cart${product.stock <= 0 ? " quick-view-panel__btn-cart--disabled" : ""}`}
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
            >
              {product.stock <= 0 ? "Agotado" : "Agregar al carrito"}
            </button>

            <Link
              to={`/producto/${product.id}`}
              className="quick-view-panel__btn-detail"
              onClick={onClose}
            >
              Ver producto completo
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickViewModal;
