import React from "react";
import "../styles/CartDrawer.scss";
import { useCart } from "./CartContext";

const CartDrawer = ({ isOpen, onClose }) => {
  const { items, inc, dec, remove, total } = useCart();

  return (
    <div className={`cart-drawer ${isOpen ? "open" : ""}`}>
      <div className="cart-header">
        <h2>Carrito</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="cart-content">
        {items.length === 0 ? (
          <p className="empty">Tu carrito está vacío</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="cart-item">
              {item.image && <img src={item.image} alt={item.name} />}
              <div className="info">
                <h4>{item.name}</h4>
                <p>${item.price}</p>
                <div className="quantity">
                  <button onClick={() => dec(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => inc(item.id)}>+</button>
                </div>
                <button className="remove" onClick={() => remove(item.id)}>Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cart-footer">
          <h3>Total: ${total.toFixed(2)}</h3>
          <button className="checkout">Ir a pagar</button>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
