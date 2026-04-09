import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider }     from "./components/AuthContext.jsx";
import { ProductsProvider } from "./components/ProductsContext.jsx";
import { CartProvider }     from "./components/CartContext.jsx";
import { WishlistProvider } from "./components/WishlistContext.jsx";
import "./styles/global.scss";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  </React.StrictMode>
);
