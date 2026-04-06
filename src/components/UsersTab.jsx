import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import "../styles/UsersTab.scss";

const PERMISSIONS = [
  "Crear productos",
  "Editar productos",
  "Ver reportes",
  "Administrar usuarios",
];

const UsersTab = () => {
  const { users, createUser, updateUser, currentUser } = useContext(AuthContext);

  const emptyForm = {
    name: "",
    email: "",
    password: "",
    permissions: [],
    status: "Activo",
  };

  const [form, setForm] = useState(emptyForm);
  const [selectedUser, setSelectedUser] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [valid, setValid] = useState({ email: true, password: true });

  /* ================= VALIDACIONES ================= */
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setValid({
      email: emailRegex.test(form.email),
      password: form.password.length >= 4,
    });
  }, [form.email, form.password]);

  /* ================= HELPERS ================= */
  const now = () =>
    new Date().toLocaleString("es-UY", { hour12: false });

  const showFeedback = (msg, type = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        permissions: checked
          ? [...prev.permissions, value]
          : prev.permissions.filter((p) => p !== value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!valid.email || !valid.password) {
      showFeedback("Datos inválidos", "error");
      return;
    }

    if (selectedUser) {
      updateUser(selectedUser.id, {
        ...form,
        updatedAt: now(),
        updatedBy: currentUser?.email || "admin",
      });

      showFeedback("Usuario actualizado");
    } else {
      createUser({
        ...form,
        role: "Empleado",
        createdAt: now(),
        createdBy: currentUser?.email || "admin",
      });

      showFeedback("Empleado creado");
    }

    setForm(emptyForm);
    setSelectedUser(null);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: user.password,
      permissions: user.permissions || [],
      status: user.status,
    });
  };

  const toggleStatus = (user) => {
    updateUser(user.id, {
      status: user.status === "Activo" ? "Suspendido" : "Activo",
      updatedAt: now(),
      updatedBy: currentUser?.email || "admin",
    });
  };

  /* ================= RENDER ================= */
  return (
    <div className="users-tab">
      <h2>Gestión de empleados</h2>

      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* ===== FORMULARIO ===== */}
      <form className="users-form" onSubmit={handleSubmit}>
        <h3>{selectedUser ? "Editar empleado" : "Nuevo empleado"}</h3>

        <input
          name="name"
          placeholder="Nombre"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className={!valid.email ? "invalid" : ""}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          className={!valid.password ? "invalid" : ""}
          required
        />

        <div className="permissions">
          <span>Permisos</span>
          {PERMISSIONS.map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                value={p}
                checked={form.permissions.includes(p)}
                onChange={handleChange}
              />
              {p}
            </label>
          ))}
        </div>

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="Activo">Activo</option>
          <option value="Suspendido">Suspendido</option>
        </select>

        <button type="submit">
          {selectedUser ? "Guardar cambios" : "Crear empleado"}
        </button>
      </form>

      {/* ===== LISTA ===== */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Permisos</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.status === "Suspendido" ? "disabled" : ""}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.status}</td>
              <td>{u.permissions?.join(", ") || "-"}</td>
              <td>
                {u.createdAt}
                <br />
                <small>{u.createdBy}</small>
              </td>
              <td>
                <button onClick={() => handleEdit(u)}>Editar</button>
                <button onClick={() => toggleStatus(u)}>
                  {u.status === "Activo" ? "Suspender" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTab;
