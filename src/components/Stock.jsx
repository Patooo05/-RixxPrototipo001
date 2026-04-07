import React, { useState, useContext } from "react";
import { ProductsContext } from "./ProductsContext";
import "../styles/Stock.scss";

const typeLabel = (type) => {
  if (type === "edit")   return "Ajuste manual";
  if (type === "sale")   return "Venta";
  if (type === "delete") return "Eliminación";
  return type;
};

const formatHistoryDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("es-UY", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const Stock = ({ currentUser }) => {
  const { products, updateStock, history, registerSale } =
    useContext(ProductsContext);

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log("Archivo CSV cargado:", file.name);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSale = () => {
    if (!selectedProduct || saleQuantity <= 0) return;
    registerSale(selectedProduct, saleQuantity);
    setSaleQuantity(1);
    setSelectedProduct("");
  };

  const salesCount  = history.filter((h) => h.type === "sale").length;
  const editsCount  = history.filter((h) => h.type === "edit").length;

  return (
    <div className="stock-container">
      {/* ---------- TÍTULO ---------- */}
      <h2>ERP Lentes - Stock y Ventas</h2>

      {currentUser && (
        <p>
          Usuario: <strong>{currentUser?.name}</strong> — Rol:{" "}
          <strong>{currentUser?.role}</strong>
        </p>
      )}

      {/* ---------- SUBIR CSV ---------- */}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={currentUser?.role !== "Administrador"}
      />

      {error && <p className="error-message">{error}</p>}

      {/* ---------- LISTA DE PRODUCTOS ---------- */}
      <h3>Lista de Productos</h3>
      <input
        type="text"
        placeholder="Buscar producto..."
        className="search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="stock-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Modelo</th>
            <th>Stock</th>
            <th>Actualizar stock</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <tr
              key={product.id}
              className={
                product.stock === 0
                  ? "low-stock"
                  : product.stock <= 5
                  ? "low-stock"
                  : product.stock <= 15
                  ? "medium-stock"
                  : "high-stock"
              }
            >
              <td>{product.id}</td>
              <td>{product.name}</td>
              <td>{product.stock}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  defaultValue={product.stock}
                  onBlur={(e) => updateStock(product.id, Number(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------- REGISTRAR VENTA ---------- */}
      <h3>Registrar Venta</h3>
      <div className="sales-section">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Seleccionar producto...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (Stock: {p.stock})
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={saleQuantity}
          onChange={(e) => setSaleQuantity(Number(e.target.value))}
        />

        <button onClick={handleSale}>Vender</button>
      </div>

      {/* ---------- HISTORIAL ---------- */}
      <h3>Historial de Cambios</h3>

      {history.length > 0 && (
        <p className="history-summary">
          {salesCount} ventas registradas · {editsCount} ajustes manuales
        </p>
      )}

      <table className="history-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Acción</th>
            <th>Cantidad</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, index) => {
            const productName =
              products.find((p) => p.id === h.productId)?.name ||
              `#${h.productId}`;
            const isMinus = h.type === "sale" || h.type === "delete";
            return (
              <tr
                key={index}
                className={
                  h.type === "edit"
                    ? "edit-action"
                    : h.type === "delete"
                    ? "delete-action"
                    : "sale-action"
                }
              >
                <td>{productName}</td>
                <td>{typeLabel(h.type)}</td>
                <td className={isMinus ? "qty-minus" : "qty-plus"}>
                  {isMinus ? `−${h.quantity}` : `+${h.quantity}`}
                </td>
                <td>{formatHistoryDate(h.date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Stock;
