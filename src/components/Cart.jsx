import { useState } from "react";
import "../styles/Cart.scss";
import './variables.scss';


const Cart = ({ items = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="cart-container">
      {/* Icono carrito */}
      <button className="cart-button" onClick={() => setIsOpen(!isOpen)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="cart-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8h14l-2-8M5 21h14"
          />
        </svg>
        {totalItems > 0 && <span className="badge">{totalItems}</span>}
      </button>

      {/* Dropdown del carrito */}
      {isOpen && (
        <div className="cart-dropdown">
          {items.length === 0 ? (
            <p className="empty">Tu carrito está vacío</p>
          ) : (
            <>
              <ul className="cart-items">
                {items.map((item) => (
                  <li key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} />
                    <div className="item-info">
                      <p>{item.name}</p>
                      <span>{item.quantity} x ${item.price}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="cart-footer">
                <button className="checkout-btn">Ir a pagar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Cart;
