import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import QuantitySelector from "./QuantitySelector";
import { useCart } from "./CartContext";
import "../styles/ProductDetail.scss";

const ProductDetail = () => {
  const { id } = useParams();
  const { products } = useContext(ProductsContext);
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const product = products.find(p => String(p.id) === id);

  if (!product) return (
    <main className="product-detail" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--on-surface-variant)" }}>Producto no encontrado.</p>
    </main>
  );

  const soldOut = product.stock <= 0;

  return (
    <main className="product-detail">
      <div className="product-detail__container">

        {/* Imagen */}
        <div className="product-detail__gallery">
          <div className="main-image">
            {product.image
              ? <img src={product.image} alt={product.name} />
              : <div style={{ width: "100%", height: "100%", background: "#111" }} />
            }
          </div>
        </div>

        {/* Info */}
        <div className="product-detail__info">
          {product.category && (
            <span className="product-detail__category">{product.category}</span>
          )}

          <h1 className="product-detail__name">{product.name}</h1>

          <p className="product-detail__price">${product.price} USD</p>

          {product.description && (
            <p className="product-detail__description">{product.description}</p>
          )}

          {product.characteristics && product.characteristics.length > 0 && (
            <ul style={{ paddingLeft: "1.2rem", color: "var(--on-surface-variant)", fontSize: "0.875rem", lineHeight: 1.8 }}>
              {product.characteristics.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}

          <p style={{ fontSize: "0.8rem", color: product.stock > 0 ? "#a5ff6c" : "#ffb4ab" }}>
            {soldOut ? "Sin stock" : `Stock disponible: ${product.stock}`}
          </p>

          {!soldOut && <QuantitySelector value={qty} onChange={setQty} />}

          {soldOut ? (
            <button className="product-detail__sold-out" disabled>Agotado</button>
          ) : (
            <button className="product-detail__add-btn" onClick={() => add(product, qty)}>
              Añadir al carrito
            </button>
          )}
        </div>

      </div>
    </main>
  );
};

export default ProductDetail;
