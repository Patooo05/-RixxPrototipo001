import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider }     from "./components/AuthContext.jsx";
import { ProductsProvider } from "./components/ProductsContext.jsx";
import { CartProvider }     from "./components/CartContext.jsx";
import { WishlistProvider } from "./components/WishlistContext.jsx";
import { OrdersProvider }   from "./components/OrdersContext.jsx";
import { ToastProvider }    from "./components/ToastContext.jsx";
import { ReviewsProvider }  from "./components/ReviewsContext.jsx";
import "./styles/global.scss";

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <WishlistProvider>
            <OrdersProvider>
              <ToastProvider>
                <ReviewsProvider>
                  <App />
                </ReviewsProvider>
              </ToastProvider>
            </OrdersProvider>
          </WishlistProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  </React.StrictMode>
);
