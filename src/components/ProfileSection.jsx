// src/components/ProfileSection.jsx
import React from "react";

const ProfileSection = ({ section }) => {
  switch (section) {
    case "Información":
      return <div><h2>Tu Información</h2><p>Detalles del usuario aquí...</p></div>;
    case "Pedidos":
      return <div><h2>Pedidos</h2><p>Listado de pedidos...</p></div>;
    case "Ajustes":
      return <div><h2>Ajustes</h2><p>Opciones de configuración...</p></div>;
    default:
      return <div>Sección no encontrada</div>;
  }
};

export default ProfileSection;
