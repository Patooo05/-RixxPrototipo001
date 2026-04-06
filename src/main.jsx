import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ProductsProvider } from "./components/ProductsContext.jsx";
import { AuthProvider } from "./components/AuthContext.jsx"; // ✅ ruta correcta
import "./styles/global.scss";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductsProvider>
        <App />
      </ProductsProvider>
    </AuthProvider>
  </React.StrictMode>
);
