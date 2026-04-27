const PREFETCHERS = {
  '/productos':   () => import('../components/ProductsGrid.jsx'),
  '/producto':    () => import('../components/ProductDetail.jsx'),
  '/perfil':      () => import('../components/Profile.jsx'),
  '/checkout':    () => import('../components/Checkout.jsx'),
  '/mis-pedidos': () => import('../components/MyOrders.jsx'),
  '/favoritos':   () => import('../components/Favorites.jsx'),
  '/about':       () => import('../components/Nosotros.jsx'),
  '/contacto':    () => import('../components/Contacto.jsx'),
  '/admin':       () => import('../components/Admin.jsx'),
};

export function prefetchRoute(path) {
  const key = Object.keys(PREFETCHERS).find(k => path.startsWith(k));
  if (key) PREFETCHERS[key]();
}
