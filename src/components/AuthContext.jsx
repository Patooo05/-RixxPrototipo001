/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext();

// ─── localStorage fallback helpers ────────────────────────────────────────────
// These are only used when VITE_SUPABASE_URL is not configured.

const hashPwd = (pwd) => `h:${btoa(unescape(encodeURIComponent(String(pwd))))}`;
const checkPwd = (plain, stored) =>
  stored?.startsWith("h:") ? stored === hashPwd(plain) : plain === stored;

const migrateUsers = (users) =>
  users.map((u) =>
    u.password && !u.password.startsWith("h:")
      ? { ...u, password: hashPwd(u.password) }
      : u
  );

// ─── localStorage AuthProvider ─────────────────────────────────────────────────

const LocalStorageAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const { password: _omit, ...safe } = parsed;
      return safe;
    } catch { return null; }
  });

  const [users, setUsers] = useState(() => {
    const stored = localStorage.getItem("users");
    const base = stored
      ? JSON.parse(stored)
      : [{ id: 1, name: "Admin", email: "admin@admin.com", password: "1234", role: "Administrador" }];
    const migrated = migrateUsers(base);
    if (migrated.some((u, i) => u.password !== base[i]?.password)) {
      localStorage.setItem("users", JSON.stringify(migrated));
    }
    return migrated;
  });

  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
  };

  const safeUser = (user) => {
    const { password: _omit, ...safe } = user;
    return safe;
  };

  const login = (email, password) => {
    const user = users.find(u => u.email === email && checkPwd(password, u.password));
    if (!user) return false;
    const safe = safeUser(user);
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return true;
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  };

  const register = (name, email, password) => {
    if (!name || !email || !password) return { ok: false, error: "Completá todos los campos" };
    if (users.some(u => u.email === email)) return { ok: false, error: "Este email ya está registrado" };
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashPwd(password),
      role: "Cliente",
      active: true,
      permissions: [],
    };
    const newList = [...users, newUser];
    saveUsers(newList);
    const safe = safeUser(newUser);
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return { ok: true };
  };

  const updateUser = ({ name, email, password }) => {
    if (!currentUser) return { ok: false, error: "No hay sesión activa" };
    const trimmedName = (name ?? "").trim();
    const trimmedEmail = (email ?? "").trim();
    if (!trimmedName) return { ok: false, error: "El nombre no puede estar vacío" };
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return { ok: false, error: "Email inválido" };
    if (
      trimmedEmail !== currentUser.email &&
      users.some(u => u.email === trimmedEmail && u.id !== currentUser.id)
    ) return { ok: false, error: "Ese email ya está en uso" };

    const updated = users.map(u => {
      if (u.id !== currentUser.id) return u;
      const base = { ...u, name: trimmedName, email: trimmedEmail };
      return password ? { ...base, password: hashPwd(password) } : base;
    });
    saveUsers(updated);

    const updatedUser = updated.find(u => u.id === currentUser.id);
    const { password: _omit, ...safe } = updatedUser;
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return { ok: true };
  };

  const toggleUserStatus = (id) => {
    const updated = users.map(u =>
      u.id === id ? { ...u, active: u.active === false ? true : false } : u
    );
    saveUsers(updated);
  };

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

  const createUser = (email, password, name, cloneFromEmail) => {
    if (!email || !password || !name) return false;
    if (users.some(u => u.email === email)) return false;
    const cloneFrom = users.find(u => u.email === cloneFromEmail);
    const role = cloneFrom ? cloneFrom.role : "Cliente";
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashPwd(password),
      role,
      active: true,
      permissions: [],
    };
    saveUsers([...users, newUser]);
    return true;
  };

  const refreshUsers = () => {
    // No-op in localStorage mode — users state is always up-to-date
  };

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "Administrador";
  const username = currentUser?.name;

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
      logout,
      register,
      updateUser,
      isLoggedIn,
      isAdmin,
      username,
      createUser,
      toggleUserStatus,
      togglePermission,
      refreshUsers,
      loading: false,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Supabase AuthProvider (disabled — auth stays in localStorage) ────────────
// Kept here for future reference if Supabase Auth is needed later.

const buildUserFromProfile = (profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  active: profile.active,
  permissions: profile.permissions || [],
});

const SupabaseAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch a single user's profile from user_profiles
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  };

  // Fetch all user profiles (for admin panel)
  const refreshUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setUsers(data.map(buildUserFromProfile));
    } catch {
      // Silently fail — non-admin users may not have SELECT access to all rows
    }
  }, []);

  // On mount: restore session and subscribe to auth changes
  useEffect(() => {
    let authListener = null;

    const init = async () => {
      const timeoutId = setTimeout(() => {
        // Si Supabase no responde en 6s, desbloquea la UI como no logueado
        setLoading(false);
      }, 6000);

      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('auth-timeout')), 6000)),
        ]);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) setCurrentUser(buildUserFromProfile(profile));
        }
      } catch {
        // Session restore failed or timed out — treat as logged out
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) setCurrentUser(buildUserFromProfile(profile));
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setUsers([]);
      }
    });

    authListener = listener;
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  // Load all users once admin is confirmed
  useEffect(() => {
    if (currentUser?.role === "Administrador") {
      refreshUsers();
    }
  }, [currentUser?.role, refreshUsers]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (email, password) => {
    // Primero chequea localStorage (admin hardcodeado + empleados locales)
    try {
      const localUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const localUser = localUsers.find((u) => u.email === email);
      if (localUser && checkPwd(password, localUser.password)) {
        const { password: _omit, ...safe } = localUser;
        setCurrentUser(safe);
        localStorage.setItem("currentUser", JSON.stringify(safe));
        return true;
      }
    } catch { /* ignorar */ }

    // Si no está en local, intenta Supabase con timeout de 8s
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      if (result.error) throw result.error;
      const profile = await fetchProfile(result.data.user.id);
      if (profile) setCurrentUser(buildUserFromProfile(profile));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Limpia estado local inmediatamente, sin esperar Supabase
    setCurrentUser(null);
    setUsers([]);
    localStorage.removeItem("currentUser");
    // Intenta cerrar sesión en Supabase en segundo plano (sin bloquear)
    supabase?.auth.signOut().catch(() => {});
  };

  const register = async (name, email, password) => {
    if (!name || !email || !password) return { ok: false, error: "Completá todos los campos" };

    // ── Verificar email duplicado en localStorage primero ──────────────────────
    const localUsers = (() => { try { return JSON.parse(localStorage.getItem("users") || "[]"); } catch { return []; } })();
    if (localUsers.some(u => u.email === email)) {
      return { ok: false, error: "Este email ya está registrado. ¿Querés iniciar sesión?" };
    }

    // ── Intentar Supabase Auth ─────────────────────────────────────────────────
    let supabaseUserId = null;
    try {
      const { data, error } = await Promise.race([
        supabase.auth.signUp({ email, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signUp-timeout')), 10000)),
      ]);

      if (error) {
        const msg  = error.message?.toLowerCase() ?? "";
        const code = error.code ?? "";
        const status = error.status ?? 0;
        // Email duplicado → error definitivo, no hacer fallback
        if (code === "user_already_exists" || msg.includes("already") || msg.includes("registered")) {
          return { ok: false, error: "Este email ya está registrado. ¿Querés iniciar sesión?" };
        }
        // Todos los demás errores (rate limit, email inválido, contraseña débil, etc.)
        // → continuar con fallback localStorage
        console.warn("[Auth] signUp Supabase falló, usando fallback localStorage:", code, error.message);
      } else {
        supabaseUserId = data.user?.id ?? null;
      }
    } catch (err) {
      if (err.message !== "signUp-timeout") {
        console.warn("[Auth] signUp excepción, usando fallback localStorage:", err.message);
      }
    }

    // ── Crear usuario localmente (fallback o complemento del auth de Supabase) ──
    const newUser = {
      id: supabaseUserId ?? crypto.randomUUID(),
      name,
      email,
      password: hashPwd(password),
      role: "Cliente",
      active: true,
      permissions: [],
    };

    // Guardar en localStorage
    try {
      localStorage.setItem("users", JSON.stringify([...localUsers, newUser]));
    } catch { /* quota — no crítico */ }

    // Intentar crear perfil en Supabase user_profiles en segundo plano
    const { password: _omit, ...profilePayload } = newUser;
    supabase.from("user_profiles").upsert(profilePayload, { onConflict: "id" }).then(null, () => {});

    const { password: _pw, ...safe } = newUser;
    setCurrentUser(safe);
    localStorage.setItem("currentUser", JSON.stringify(safe));
    return { ok: true };
  };

  const updateUser = async ({ name, email, password }) => {
    if (!currentUser) return { ok: false, error: "No hay sesión activa" };
    const trimmedName = (name ?? "").trim();
    const trimmedEmail = (email ?? "").trim();
    if (!trimmedName) return { ok: false, error: "El nombre no puede estar vacío" };
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return { ok: false, error: "Email inválido" };

    try {
      const updates = { name: trimmedName, email: trimmedEmail };
      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", currentUser.id);
      if (error) throw error;

      if (password) {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw pwdError;
      }

      const updated = { ...currentUser, name: trimmedName, email: trimmedEmail };
      setCurrentUser(updated);
      localStorage.setItem("currentUser", JSON.stringify(updated));
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo actualizar el perfil. Intentá de nuevo." };
    }
  };

  const createUser = async (email, password, name, role = "Empleado", permissions = []) => {
    if (!email || !name) return false;
    try {
      // Insert pre-approved profile — no signUp needed.
      // When the employee registers with this email, their account links automatically.
      const profilePayload = {
        id: crypto.randomUUID(),
        name,
        email,
        role,
        active: true,
        permissions,
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(profilePayload, { onConflict: "id" });
      if (error) throw error;

      await refreshUsers();
      return true;
    } catch {
      return false;
    }
  };

  const toggleUserStatus = async (id) => {
    try {
      const target = users.find(u => u.id === id);
      if (!target) return;
      const newActive = !target.active;

      const { error } = await supabase
        .from("user_profiles")
        .update({ active: newActive })
        .eq("id", id);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, active: newActive } : u));
    } catch {
      // Silently fail — caller may show its own error UI
    }
  };

  const togglePermission = async (id, perm) => {
    try {
      const target = users.find(u => u.id === id);
      if (!target) return;
      const perms = target.permissions || [];
      const newPerms = perms.includes(perm)
        ? perms.filter(p => p !== perm)
        : [...perms, perm];

      const { error } = await supabase
        .from("user_profiles")
        .update({ permissions: newPerms })
        .eq("id", id);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, permissions: newPerms } : u));
    } catch {
      // Silently fail
    }
  };

  // ── Computed values ───────────────────────────────────────────────────────

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "Administrador";
  const username = currentUser?.name;

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
      logout,
      register,
      updateUser,
      isLoggedIn,
      isAdmin,
      username,
      createUser,
      toggleUserStatus,
      togglePermission,
      refreshUsers,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Unified export ────────────────────────────────────────────────────────────
// Uses Supabase Auth when Supabase is configured (requires user_profiles table).
// Falls back to localStorage auth when Supabase is not available.

import { isSupabaseEnabled } from "../lib/supabase";

export const AuthProvider = ({ children }) => {
  return isSupabaseEnabled
    ? <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    : <LocalStorageAuthProvider>{children}</LocalStorageAuthProvider>;
};
