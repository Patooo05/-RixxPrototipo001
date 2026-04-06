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
