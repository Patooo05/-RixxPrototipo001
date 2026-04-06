import React, { useState } from "react";
import "../styles/CartDrawer.scss";

const CartDrawer = ({ isOpen, onClose }) => {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Lente Vintage A",
      price: 120,
      quantity: 1,
      image: "/assets/img/product1.png",
    },
    {
      id: 2,
      name: "Lente Vintage B",
      price: 150,
      quantity: 2,
      image: "/assets/img/product2.png",
    },
  ]);

  const increaseQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const decreaseQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item
    ));
  };

  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className={`cart-drawer ${isOpen ? "open" : ""}`}>
      <div className="cart-header">
        <h2>Carrito</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="cart-content">
        {cartItems.length === 0 ? (
          <p className="empty">Tu carrito está vacío</p>
        ) : (
          cartItems.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="info">
                <h4>{item.name}</h4>
                <p>${item.price}</p>
                <div className="quantity">
                  <button onClick={() => decreaseQuantity(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => increaseQuantity(item.id)}>+</button>
                </div>
                <button className="remove" onClick={() => removeItem(item.id)}>Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="cart-footer">
          <h3>Total: ${total}</h3>
          <button className="checkout">Ir a pagar</button>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
