# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (HMR on localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint (flat config, v9 format)
```

The backend is optional and independent of the frontend:
```bash
node src/js/Server.js   # Express 5 + Socket.IO on port 4000 (optional)
```

No test suite is configured.

## Architecture

**Stack:** React 19 + React Router v7 + SCSS + Vite. Context API for global state. Optional Express 5 + Socket.IO backend with MySQL fallback to in-memory arrays. Product data is fetched from **Supabase** when configured; falls back to `localStorage`.

### State Management — Three Context Providers

`main.jsx` wraps the app in nested providers in this order:
```
AuthProvider → ProductsProvider → CartProvider → <App />
```

- **AuthContext** — `currentUser`, `users[]`, login/logout/register, role checks (`isAdmin`). Persisted to `localStorage`.
- **ProductsContext** — Product catalog fetched from Supabase (or `localStorage` fallback), filter state (`search`, `categoryFilter`, `sortOrder`), computed `filteredProducts` via `useMemo`. Also tracks stock `history[]` and a `changeLog[]` persisted to Supabase's `change_log` table.
- **CartContext** — `items[]`, add/inc/dec/remove/clear. Exposed via `useCart()` hook. Persisted to `localStorage` as `rixx_cart`.

### Routing (App.jsx)

All routes defined in `App.jsx`. Admin access is gated by `<ProtectedAdminRoute>` which checks `isLoggedIn && isAdmin` from AuthContext and redirects to `/` otherwise. The cart drawer is controlled by `isCartOpen` state in `App.jsx`, passed down as props.

### Design System — "Noir Atelier"

All design tokens are in `src/styles/variables.scss`. Never hardcode colors or spacing — use variables.

Key tokens:
- Primary/gold accent: `$primary` (`#D4AF37`)
- Background: `$background` (`#0a0a0a`)
- Typography: `$font-serif` (Noto Serif) for headlines, `$font-sans` (Manrope) for body

Reusable mixins in `src/styles/mixins.scss`:
- `@include glass-surface()` — glassmorphism panel
- `@include btn-primary` / `@include btn-secondary` — CTA styles
- `@include gold-gradient()`, `@include ambient-shadow`, `@include label-uppercase()`

Each component has a corresponding `.scss` file. Use BEM naming: `.block__element--modifier`.

### Animation Patterns

- **Fade-in on scroll** (`src/js/Home.js`): IntersectionObserver adds `.visible` to `.fade-in-on-scroll` elements.
- **Navbar intro sequence** (`src/js/Navbar.js`): Orchestrated setTimeout chain; clears all timers on scroll so user isn't locked out.
- **Parallax 3D cards** (`FeaturedProducts.jsx`): Mouse position drives `rotateX/rotateY` CSS transforms + a spotlight effect via CSS custom properties `--x`/`--y`.

### Backend (src/js/Server.js)

Express 5 + Socket.IO server, optional — the frontend works standalone with Context API. Uses MySQL if `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_DB` env vars are set; otherwise falls back to an in-memory `memProducts[]` array. Emits Socket.IO events on product create/delete. Port defaults to `4000`, CORS origin defaults to `http://localhost:5173`.

## Product Grid & Filters

### Categories
The store uses three collection categories defined in `FilterBar.jsx`:
```js
const CATEGORIES = ["Todos", "Rixx 001", "Rixx 002", "Rixx 003"];
```
These map to the `category` field in Supabase products. Only the category filter is shown — **price filter and sort order have been removed from the UI**.

### Empty States (`ProductsGrid.jsx`)
Two distinct empty states:
- **Category with no products** (`categoryFilter !== "Todos"` + no results): Editorial "coming soon" message — *"Esta colección está siendo curada..."* with a golden eyebrow and subtle radial gradient. Modifier: `.products-grid__empty--collection`.
- **Search with no results**: Simple message — *"Sin resultados, probá con otro término."*

### Product Card Image Layout (`ProductCard.scss`)
Images use the **padding-top percentage trick** for a guaranteed 3:4 portrait aspect ratio that is immune to image dimensions from the database:
```scss
&__image-wrapper {
  width: 100%;
  padding-top: 133.33%; /* 3:4 ratio */
  position: relative;
  overflow: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
```

### Grid Columns
Both `featured-grid` and `products-grid__items` use `minmax(0, 1fr)` — **not** plain `1fr` — to prevent images from the database from expanding grid columns beyond their equal fraction:
```scss
grid-template-columns: repeat(3, minmax(0, 1fr));
```

## Key Conventions

- Auth data (passwords, session) lives only in `localStorage` — this is intentional for the prototype; no backend auth.
- The hardcoded admin credentials are `admin@admin.com` / `1234`.
- Product images are stored as URLs in Supabase (not local assets).
- `src/lib/api.js` is the HTTP client for backend calls; `src/lib/socket.js` is a stub (not yet implemented).
- `src/App.css` is intentionally empty — all styles live in SCSS files. Do not add global styles to `App.css`.
- ESLint uses the new flat config format (`eslint.config.js`); uppercase variables are exempted from `no-unused-vars` via `varsIgnorePattern`.
