import React from "react";
import "../styles/ProductsGrid.scss";

const ProductCard = ({ product }) => {
  const soldOut = product.stock <= 0;

  return (
    <div className={`product-card ${soldOut ? "sold-out" : ""}`}>
      {soldOut && <span className="sold-out-label">Sold Out</span>}
      {product.image && <img src={product.image} alt={product.name} />}
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="price">${product.price}</p>
        {product.category && <p className="category">{product.category}</p>}
        <p className="stock">{soldOut ? "Agotado" : `Stock: ${product.stock}`}</p>
        <button
  className="edit-btn"
  onClick={() => setEditingProduct(p)}
>
  Editar
</button>
      </div>
    </div>
  );
};

export default ProductCard;
