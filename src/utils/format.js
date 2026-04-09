// Precio formateado estilo uruguayo: "$ 1.250"
export const formatPrice = (price) =>
  "$ " + Number(price).toLocaleString("es-UY");

// Precio con descuento calculado
export const calcDiscountedPrice = (price, porcentaje) =>
  Math.round(price * (1 - porcentaje / 100) * 100) / 100;

// Margen % entre costo y venta
export const calcMargin = (precioCosto, price) =>
  precioCosto && price ? Math.round((1 - precioCosto / price) * 100) : null;
