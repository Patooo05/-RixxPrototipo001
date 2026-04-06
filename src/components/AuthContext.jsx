import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Estado del usuario actual
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  // Lista de usuarios
  const [users, setUsers] = useState(() => {
    const stored = localStorage.getItem("users");
    if (stored) return JSON.parse(stored);
    // Usuario inicial: admin
    return [
      { id: 1, name: "Admin", email: "admin@admin.com", password: "1234", role: "Administrador" }
    ];
  });

  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
  };

  // Login
  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return false;

    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
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
      password,
      role: "Cliente"
    };
    const newList = [...users, newUser];
    saveUsers(newList);
    setCurrentUser(newUser);
    localStorage.setItem("currentUser", JSON.stringify(newUser));
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
      password,
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
