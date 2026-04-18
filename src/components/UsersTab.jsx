import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";
import "../styles/UsersTab.scss";

const PERMISSIONS = [
  "Crear productos",
  "Editar productos",
  "Ver reportes",
  "Administrar usuarios",
];

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const UsersTab = () => {
  const { users, createUser, updateUser, currentUser } = useContext(AuthContext);
  const formRef = useRef(null);

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailDupeError, setEmailDupeError] = useState("");

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
      // Limpiar error de duplicado al escribir en email
      if (name === "email") setEmailDupeError("");
    }
  };

  const handleEmailBlur = () => {
    if (!form.email) return;
    const isDupe = users.some(
      (u) => u.email === form.email && u.id !== selectedUser?.id
    );
    setEmailDupeError(isDupe ? "Este email ya está en uso" : "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!valid.email || !valid.password) {
      showFeedback("Datos inválidos", "error");
      return;
    }

    // Validación de email duplicado
    const isDupe = users.some(
      (u) => u.email === form.email && u.id !== selectedUser?.id
    );
    if (isDupe) {
      setEmailDupeError("Este email ya está en uso");
      showFeedback("Este email ya está en uso", "error");
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
    setEmailDupeError("");
    setShowPassword(false);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEmailDupeError("");
    setShowPassword(false);
    setForm({
      name: user.name,
      email: user.email,
      password: user.password,
      permissions: user.permissions || [],
      status: user.status,
    });
    // #7 — scroll al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const toggleStatus = (user) => {
    updateUser(user.id, {
      status: user.status === "Activo" ? "Suspendido" : "Activo",
      updatedAt: now(),
      updatedBy: currentUser?.email || "admin",
    });
  };

  const employeeList = users.filter((u) => u.role !== "Administrador" && u.role !== "Cliente");

  /* ================= RENDER ================= */
  return (
    <div className="users-tab">
      <h2>Gestión de empleados</h2>

      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* ===== FORMULARIO ===== */}
      <form className="users-form" onSubmit={handleSubmit} ref={formRef}>
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
          onBlur={handleEmailBlur}
          className={(!valid.email || emailDupeError) ? "invalid" : ""}
          required
        />
        {emailDupeError && (
          <span className="field-error">{emailDupeError}</span>
        )}

        {/* #8 — toggle mostrar contraseña */}
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            className={!valid.password ? "invalid" : ""}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>

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

        <div className="form-submit">
          <button type="submit">
            {selectedUser ? "Guardar cambios" : "Crear empleado"}
          </button>
        </div>
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
          {/* #10 — estado vacío */}
          {employeeList.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state">
                Aún no hay empleados registrados.
              </td>
            </tr>
          ) : (
            employeeList.map((u) => (
              <tr key={u.id} className={u.status === "Suspendido" ? "disabled" : ""}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.status}</td>
                <td>{u.permissions?.join(", ") || "—"}</td>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTab;
