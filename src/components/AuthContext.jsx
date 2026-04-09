import React, { createContext, useState } from "react";

export const AuthContext = createContext();

// Hash simple — protege contraseñas en localStorage contra lectura casual
const hashPwd = (pwd) => `h:${btoa(unescape(encodeURIComponent(String(pwd))))}`;
const checkPwd = (plain, stored) =>
  stored?.startsWith("h:") ? stored === hashPwd(plain) : plain === stored;

// Migra usuarios con contraseñas en texto plano al formato hasheado
const migrateUsers = (users) =>
  users.map((u) =>
    u.password && !u.password.startsWith("h:")
      ? { ...u, password: hashPwd(u.password) }
      : u
  );

export const AuthProvider = ({ children }) => {
  // Estado del usuario actual
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Sanitize legacy sessions that may have stored password
      const { password: _omit, ...safe } = parsed;
      return safe;
    } catch { return null; }
  });

  // Lista de usuarios — migra contraseñas plain-text al arranque
  const [users, setUsers] = useState(() => {
    const stored = localStorage.getItem("users");
    const base = stored
      ? JSON.parse(stored)
      : [{ id: 1, name: "Admin", email: "admin@admin.com", password: "1234", role: "Administrador" }];
    const migrated = migrateUsers(base);
    // Si hubo migración, persistir de inmediato
    if (migrated.some((u, i) => u.password !== base[i]?.password)) {
      localStorage.setItem("users", JSON.stringify(migrated));
    }
    return migrated;
  });

  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
  };

  // Strip password before storing in state/localStorage
  const safeUser = (user) => {
    const { password: _omit, ...safe } = user;
    return safe;
  };

  // Login
  const login = (email, password) => {
    const user = users.find(u => u.email === email && checkPwd(password, u.password));
    if (!user) return false;

    const safe = safeUser(user);
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return true;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  };

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "Administrador";
  const username = currentUser?.name;

  // Registrar un nuevo usuario (cliente)
  const register = (name, email, password) => {
    if (!name || !email || !password) return false;
    if (users.some(u => u.email === email)) return false;

    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashPwd(password),
      role: "Cliente"
    };
    const newList = [...users, newUser];
    saveUsers(newList);
    const safe = safeUser(newUser);
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return true;
  };

  // Activar/desactivar usuario
  const toggleUserStatus = (id) => {
    const updated = users.map(u =>
      u.id === id ? { ...u, active: u.active === false ? true : false } : u
    );
    saveUsers(updated);
  };

  // Alternar permiso de un usuario
  const togglePermission = (id, perm) => {
    const updated = users.map(u => {
      if (u.id !== id) return u;
      const perms = u.permissions || [];
      const newPerms = perms.includes(perm)
        ? perms.filter(p => p !== perm)
        : [...perms, perm];
      return { ...u, permissions: newPerms };
    });
    saveUsers(updated);
  };

  // Crear un nuevo usuario (clonando permisos de otro)
  const createUser = (email, password, name, cloneFromEmail) => {
    if (!email || !password || !name) return false;

    if (users.some(u => u.email === email)) return false; // ya existe

    const cloneFrom = users.find(u => u.email === cloneFromEmail);
    const role = cloneFrom ? cloneFrom.role : "Cliente";

    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashPwd(password),
      role
    };

    const newUsersList = [...users, newUser];
    saveUsers(newUsersList);
    return true;
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
      logout,
      register,
      isLoggedIn,
      isAdmin,
      username,
      createUser,
      toggleUserStatus,
      togglePermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};
