import React, { useState, useEffect } from "react";
import ProfileSection from "./ProfileSection";
import "../styles/Profile.scss";
import { FaUser, FaBox, FaCog } from "react-icons/fa";

const sections = [
  { name: "Información", icon: <FaUser /> },
  { name: "Pedidos", icon: <FaBox /> },
  { name: "Ajustes", icon: <FaCog /> },
];

const Profile = () => {
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || sections[0].name
  );

  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);


  return (
    <div className="profile-advanced">
      {/* Sidebar */}
      <div className="profile-advanced__sidebar">
        {sections.map((section) => (
          <button
            key={section.name}
            onClick={() => setActiveSection(section.name)}
            className={`profile-advanced__tab ${
              activeSection === section.name ? "active" : ""
            }`}
          >
            <span className="profile-advanced__icon">{section.icon}</span>
            <span className="profile-advanced__label">{section.name}</span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="profile-advanced__content">
        <div
          className="profile-advanced__slider"
          style={{
            transform: `translateX(-${
              sections.findIndex((s) => s.name === activeSection) * 100
            }%)`,
          }}
        >
          {sections.map((section) => (
            <div key={section.name} className="profile-advanced__panel">
              <ProfileSection section={section.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
