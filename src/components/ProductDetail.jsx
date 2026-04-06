import React from "react";
import { useParams } from "react-router-dom";
import QuantitySelector from "./QuantitySelector";
import "../styles/ProductDetail.scss";
import { useCart } from "./CartContext";





const productData = [
  { id: 1, name: "Lente Vintage A", price: 120, description: "Lente premium vintage para hombre", image: "/assets/img/l.jpg" },
  { id: 2, name: "Lente Vintage B", price: 150, description: "Lente elegante y clásico", image: "/assets/img/2.jpg" },
  { id: 3, name: "Lente Vintage C", price: 180, description: "Lente de diseño único", image: "/assets/img/3.jpg" },
  { id: 4, name: "Lente Zoom D", price: 200, description: "Lente con zoom avanzado", image: "/assets/img/lentes_zoom1.jpg" },
];

const ProductDetail = () => {
  const { id } = useParams();
  const product = productData.find(p => p.id === parseInt(id));
  const { add } = useCart();
  const [qty, setQty] = React.useState(1);

  if (!product) return <p>Producto no encontrado</p>;

  return (
    <main className="product-detail">
      <div className="image-section">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="info-section">
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <h2>${product.price}</h2>
        <QuantitySelector value={qty} onChange={setQty} />
        <button className="add-cart" onClick={() => add(product, qty)}>Añadir al carrito</button>
      </div>
    </main>
  );
};

export default ProductDetail;