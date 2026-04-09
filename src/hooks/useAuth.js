import { useContext } from "react";
import { AuthContext } from "../components/AuthContext.jsx";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return {
    currentUser:      context.currentUser,
    isLoggedIn:       context.isLoggedIn,
    isAdmin:          context.isAdmin,
    username:         context.username,
    users:            context.users,
    login:            context.login,
    logout:           context.logout,
    register:         context.register,
    createUser:       context.createUser,
    toggleUserStatus: context.toggleUserStatus,
    togglePermission: context.togglePermission,
  };
};

export default useAuth;
