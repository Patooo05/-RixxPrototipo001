import { useState, useContext, useEffect, lazy, Suspense } from "react";
import { useCart } from "./components/CartContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar/Navbar";
import Footer from "./components/layout/Footer/Footer";
import CustomCursor     from "./components/CustomCursor.jsx";
import AnnouncementBar  from "./components/AnnouncementBar.jsx";
import SocialFloat      from "./components/SocialFloat.jsx";
import Home             from "./components/Home.jsx";

const CartDrawer    = lazy(() => import("./components/CartDrawer.jsx"));
const ProductsGrid  = lazy(() => import("./components/ProductsGrid.jsx"));
const ProductDetail = lazy(() => import("./components/ProductDetail.jsx"));
const Admin         = lazy(() => import("./components/Admin.jsx"));
const Profile       = lazy(() => import("./components/Profile.jsx"));
const Dashboard     = lazy(() => import("./dashboard/Dashboard.jsx"));
const Nosotros      = lazy(() => import("./components/Nosotros.jsx"));
const Contacto      = lazy(() => import("./components/Contacto.jsx"));
const Checkout      = lazy(() => import("./components/Checkout.jsx"));

const PageLoader = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "11px", letterSpacing: "0.4em", color: "#D4AF37", textTransform: "uppercase", opacity: 0.6 }}>Cargando</span>
  </div>
);

import { AuthContext } from "./components/AuthContext.jsx";

// ── Ruta protegida admin ──────────────────────────────────────
const ProtectedAdminRoute = ({ children }) => {
  const { isLoggedIn, isAdmin } = useContext(AuthContext);
  if (!isLoggedIn || !isAdmin) return <Navigate to="/" replace />;
  return children;
};

// ── Page transition wrapper ───────────────────────────────────
const PageWrapper = ({ children }) => {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setKey(location.pathname);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div key={key} className="page-transition">
      {children}
    </div>
  );
};

function App() {
  const { isCartOpen, openCart, closeCart } = useCart();

  return (
    <ErrorBoundary>
          <Router>
            <CustomCursor />
            <SocialFloat />
            <AnnouncementBar />
            <Navbar onCartClick={openCart} />
            <Suspense fallback={null}>
              <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
            </Suspense>
            <PageWrapper>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"             element={<Home />} />
                <Route path="/productos"    element={<ProductsGrid />} />
                <Route path="/producto/:id" element={<ProductDetail />} />
                <Route path="/admin"        element={<ProtectedAdminRoute><Admin /></ProtectedAdminRoute>} />
                <Route path="/dashboard"   element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
                <Route path="/perfil"       element={<Profile />} />
                {/* Páginas de contenido */}
                <Route path="/checkout"     element={<Checkout />} />
                <Route path="/about"        element={<Nosotros />} />
                <Route path="/contacto"     element={<Contacto />} />
                <Route path="/colecciones"  element={<Navigate to="/productos" replace />} />
                <Route path="/envios"       element={<Navigate to="/" replace />} />
                <Route path="/cambios"      element={<Navigate to="/" replace />} />
                <Route path="/preguntas"    element={<Navigate to="/" replace />} />
                <Route path="/terminos"     element={<Navigate to="/" replace />} />
                <Route path="*"             element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </PageWrapper>
            <Footer />
          </Router>
    </ErrorBoundary>
  );
}

export default App;
