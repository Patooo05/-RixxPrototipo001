import React, { useState, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar/Navbar";
import Footer from "./components/layout/Footer/Footer";

import CartDrawer from "./components/CartDrawer.jsx";
import ProductsGrid from "./components/ProductsGrid.jsx";
import ProductDetail from "./components/ProductDetail.jsx";
import Home from "./components/Home.jsx";

import Admin from "./components/Admin.jsx";
import Profile from "./components/Profile.jsx";

// Páginas informativas simples
const PlaceholderPage = ({ title }) => (
  <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0a0a", color: "#99907c", flexDirection: "column", gap: "1rem", paddingTop: "8rem" }}>
    <h1 style={{ color: "#D4AF37", fontFamily: "Noto Serif, serif" }}>{title}</h1>
    <p>Esta sección estará disponible próximamente.</p>
  </main>
);

import { AuthProvider, AuthContext } from "./components/AuthContext.jsx";
import { ProductsProvider } from "./components/ProductsContext.jsx";
import { CartProvider } from "./components/CartContext.jsx";

// Ruta protegida admin
const ProtectedAdminRoute = ({ children }) => {
  const { isLoggedIn, isAdmin } = useContext(AuthContext);
  if (!isLoggedIn || !isAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <Router>
            <Navbar onCartClick={()=>setIsCartOpen(true)} />
            <CartDrawer isOpen={isCartOpen} onClose={()=>setIsCartOpen(false)} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/productos" element={<ProductsGrid />} />
              <Route path="/producto/:id" element={<ProductDetail />} />
              <Route path="/admin" element={<ProtectedAdminRoute><Admin /></ProtectedAdminRoute>} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/about" element={<PlaceholderPage title="Nosotros" />} />
              <Route path="/contacto" element={<PlaceholderPage title="Contacto" />} />
              <Route path="/colecciones" element={<PlaceholderPage title="Colecciones" />} />
              <Route path="/envios" element={<PlaceholderPage title="Envíos" />} />
              <Route path="/cambios" element={<PlaceholderPage title="Cambios & Devoluciones" />} />
              <Route path="/preguntas" element={<PlaceholderPage title="Preguntas Frecuentes" />} />
              <Route path="/terminos" element={<PlaceholderPage title="Términos y Condiciones" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Footer />
          </Router>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}

export default App;
