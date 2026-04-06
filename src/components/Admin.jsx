import React, { useState, useContext, useMemo, useEffect } from "react";
import { ProductsContext } from "./ProductsContext";
import { AuthContext } from "./AuthContext";
import "../styles/Admin.scss";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Stock from "./Stock";
import "../styles/Stock.scss";

const Admin = () => {
  const { products, addProduct, removeProduct, toggleFeatured, updateProduct, markProductsExported } =
    useContext(ProductsContext);
  const { users, createUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [form, setForm] = useState({
    name: "",
    price: "",
    image: "",
    category: "",
    description: "",
    stock: 0,
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [flashExcel, setFlashExcel] = useState(false);
  const [flashFilters, setFlashFilters] = useState(false);

  // Formulario para crear empleado
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    cloneFromEmail: "admin@admin.com",
  });

  // Debounce búsqueda
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Estadísticas Dashboard
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock <= 5).length;
    const productsOut = products.filter((p) => p.stock === 0).length;
    const categories = [...new Set(products.map((p) => p.category))].length;
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock || 0), 0);
    const topExpensive = [...products].sort((a, b) => b.price - a.price).slice(0, 3);
    const recentProducts = [...products].sort((a, b) => b.id - a.id).slice(0, 5);
    return { totalProducts, lowStock, productsOut, categories, totalValue, topExpensive, recentProducts };
  }, [products]);

  const chartData = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({ category: key || "Sin Categoría", count: counts[key] }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = filterCategory === "Todas" || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearch, filterCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUserForm({ ...newUserForm, [name]: value });
  };

  const triggerFlash = () => {
    setFlashExcel(true);
    setFlashFilters(true);
    setTimeout(() => {
      setFlashExcel(false);
      setFlashFilters(false);
    }, 600);
  };

  const handleAddOrUpdateProduct = (e) => {
    e.preventDefault();
    if (!form.name || form.price === "") return;

    if (editingProduct) {
      updateProduct({ ...form, id: editingProduct.id, price: Number(form.price), stock: Number(form.stock) });
      setEditingProduct(null);
    } else {
      addProduct({ ...form, price: Number(form.price), stock: Number(form.stock) });
    }

    setForm({ name: "", price: "", image: "", category: "", description: "", stock: 0 });
    triggerFlash();
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      description: product.description,
      stock: product.stock,
    });
    setActiveTab("Productos");
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm({ name: "", price: "", image: "", category: "", description: "", stock: 0 });
  };

  const removeProductAndFlag = (id) => {
    removeProduct(id);
    triggerFlash();
  };

  const exportToExcel = () => {
    if (filteredProducts.length === 0) return;

    const data = filteredProducts.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Precio: p.price,
      Categoría: p.category || "N/A",
      Stock: p.stock,
      Destacado: p.featured ? "Sí" : "No",
      Descripción: p.description || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "productos.xlsx");

    markProductsExported();
    triggerFlash();
  };

  const categories = ["Todas", ...new Set(products.map((p) => p.category).filter(Boolean))];

  // Crear empleado
  const handleCreateUser = (e) => {
    e.preventDefault();
    const success = createUser(
      newUserForm.email,
      newUserForm.password,
      newUserForm.name,
      newUserForm.cloneFromEmail
    );
    if (success) {
      alert(`Usuario ${newUserForm.name} creado con permisos clonados`);
      setNewUserForm({ name: "", email: "", password: "", cloneFromEmail: "admin@admin.com" });
    } else {
      alert("Error al crear usuario. Verifica los datos o el email ya existe.");
    }
  };
  // ================= USUARIOS =================
const [userSearch, setUserSearch] = useState("");
const [userRoleFilter, setUserRoleFilter] = useState("Todos");
const [selectedUser, setSelectedUser] = useState(null);
const [permissionsUser, setPermissionsUser] = useState(null);

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2>Panel Admin</h2>
        <ul>
          {["Dashboard", "Productos", "Stock", "Usuarios"].map((tab) => (
            <li key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {tab}
            </li>
          ))}
        </ul>
      </div>

      {/* Main */}
      <div className="admin-main">
        <h1>{activeTab}</h1>

        {/* DASHBOARD */}
        {activeTab === "Dashboard" && (
          <div className="dashboard">
            <div className="stat-card">
              <h3>Total Productos</h3>
              <p>{stats.totalProducts}</p>
            </div>
            <div className="stat-card">
              <h3>Stock Bajo (≤5)</h3>
              <p>{stats.lowStock}</p>
            </div>
            <div className="stat-card">
              <h3>Agotados</h3>
              <p>{stats.productsOut}</p>
            </div>
            <div className="stat-card">
              <h3>Categorías</h3>
              <p>{stats.categories}</p>
            </div>
            <div className="stat-card">
              <h3>Valor Total Inventario</h3>
              <p>${stats.totalValue}</p>
            </div>

            <div className="chart-card">
              <h3>Productos por Categoría</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffd700" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="recent-products">
              <h3>Últimos productos agregados</h3>
              <ul>{stats.recentProducts.map((p) => <li key={p.id}>{p.name} - ${p.price} - Stock: {p.stock}</li>)}</ul>
            </div>

            <div className="top-expensive">
              <h3>Top 3 productos más caros</h3>
              <ul>{stats.topExpensive.map((p) => <li key={p.id}>{p.name} - ${p.price}</li>)}</ul>
            </div>
          </div>
        )}

        {/* PRODUCTOS */}
        {activeTab === "Productos" && (
          <>
            <div className={`filters ${flashFilters ? "flash" : ""}`}>
              <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className={`export-btn ${flashExcel ? "flash" : ""}`} onClick={exportToExcel} disabled={products.length === 0}>
                Exportar a Excel
              </button>
            </div>

            <form className="admin-form" onSubmit={handleAddOrUpdateProduct}>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre" required />
              <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="Precio" required />
              <input name="category" value={form.category} onChange={handleChange} placeholder="Categoría" />
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Descripción" />
              <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="Stock" />
              <input name="image" value={form.image} onChange={handleChange} placeholder="URL Imagen" />
              <button type="submit" className={editingProduct ? "update-btn" : "add-btn"}>
                {editingProduct ? "Actualizar Producto" : "Agregar Producto"}
              </button>
              {editingProduct && <button type="button" className="cancel-btn" onClick={handleCancelEdit}>Cancelar</button>}
            </form>

            <div className="products-grid">
              {filteredProducts.map((p) => (
                <div key={p.id} className={`product-card ${p.featured ? "featured" : ""}`}>
                  {p.isNew && <span className={`new-badge`}>Producto Nuevo</span>}
                  <div className="product-image">{p.image ? <img src={p.image} alt={p.name} /> : <span className="placeholder">Sin imagen</span>}</div>
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p>Precio: ${p.price}</p>
                    <p>Categoría: {p.category || "N/A"}</p>
                    <p className="description">{p.description || "Sin descripción"}</p>
                    <p>Stock: {p.stock}</p>
                    <label className="featured-switch">
                      <input type="checkbox" checked={p.featured} onChange={() => toggleFeatured(p.id)} />
                      <span>Destacado</span>
                    </label>
                  </div>
                  <div className="product-actions">
                    <button className="delete-btn" onClick={() => removeProductAndFlag(p.id)}>Eliminar</button>
                    <button className="edit-btn" onClick={() => handleEditProduct(p)}>Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STOCK */}
        {activeTab === "Stock" && <Stock />}

  {activeTab === "Usuarios" && (
  <div className="users-tab">

    {/* ================= CREAR USUARIO ================= */}
    <div className="users-card">
      <h2 className="users-title">Nuevo empleado</h2>

      <form className="admin-form users-form" onSubmit={handleCreateUser}>
        <div className="form-row">
          <input
            name="name"
            value={newUserForm.name}
            onChange={handleNewUserChange}
            placeholder="Nombre completo"
            required
          />
          <input
            name="email"
            value={newUserForm.email}
            onChange={handleNewUserChange}
            placeholder="Email"
            required
          />
        </div>

        <div className="form-row">
          <input
            type="password"
            name="password"
            value={newUserForm.password}
            onChange={handleNewUserChange}
            placeholder="Contraseña temporal"
            required
          />

          <select
            name="cloneFromEmail"
            value={newUserForm.cloneFromEmail}
            onChange={handleNewUserChange}
          >
            <option value="">Clonar permisos desde…</option>
            {(users || [])
              .filter((u) => u.role === "Administrador")
              .map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name} (Admin)
                </option>
              ))}
          </select>
        </div>

        <button className="primary-btn">Crear empleado</button>
      </form>
    </div>

    {/* ================= LISTADO ================= */}
    <div className="users-card">
      <div className="users-header">
        <h2 className="users-title">Usuarios del sistema</h2>
        <span>Total: {(users || []).length}</span>
      </div>

      {/* FILTROS */}
      <div className="users-filters">
        <input
          placeholder="Buscar por nombre o email…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />

        <select
          value={userRoleFilter}
          onChange={(e) => setUserRoleFilter(e.target.value)}
        >
          <option value="Todos">Todos</option>
          <option value="Administrador">Administradores</option>
          <option value="Empleado">Empleados</option>
        </select>
      </div>

      {/* TABLA */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {(users || [])
            .filter((u) => {
              const search =
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase());

              const role =
                userRoleFilter === "Todos" || u.role === userRoleFilter;

              return search && role;
            })
            .map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role === "Administrador" ? "admin" : "employee"}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="status active">Activo</span>
                </td>
                <td className="actions">
                  <button className="action-btn view" onClick={() => setSelectedUser(u)}>
                    Ver
                  </button>
                  <button className="action-btn perms" onClick={() => setPermissionsUser(u)}>
                    Permisos
                  </button>
                  <button className="action-btn danger" onClick={() => toggleUserStatus(u.id)}>
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    {/* ================= MODAL DETALLE ================= */}
    {selectedUser && (
      <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>{selectedUser.name}</h2>
          <p><strong>Email:</strong> {selectedUser.email}</p>
          <p><strong>Rol:</strong> {selectedUser.role}</p>

          <h4>Historial de acciones</h4>
          <p className="empty-state">Sin acciones registradas</p>

          <button className="primary-btn" onClick={() => setSelectedUser(null)}>
            Cerrar
          </button>
        </div>
      </div>
    )}

    {/* ================= MODAL PERMISOS ================= */}
    {permissionsUser && (
      <div className="modal-overlay" onClick={() => setPermissionsUser(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Permisos de {permissionsUser.name}</h2>

          {["Productos", "Stock", "Usuarios"].map((perm) => (
            <label key={perm} className="checkbox">
              <input
                type="checkbox"
                onChange={() => togglePermission(permissionsUser.id, perm)}
              />
              {perm}
            </label>
          ))}

          <button className="primary-btn" onClick={() => setPermissionsUser(null)}>
            Guardar
          </button>
        </div>
      </div>
    )}

  </div>
)}


      
      </div>
    </div>
  );
};

export default Admin;
