import { useState, useEffect, useContext } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import ProfileSection from "./ProfileSection";
import { AuthContext } from "./AuthContext";
import "../styles/Profile.scss";

const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconBox = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconSettings = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const sections = [
  { name: "Información", icon: <IconUser /> },
  { name: "Pedidos",     icon: <IconBox />  },
  { name: "Ajustes",     icon: <IconSettings /> },
];

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
}

const Profile = () => {
  usePageTitle("Mi perfil");
  const { currentUser } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || sections[0].name
  );

  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);

  useEffect(() => {
    const goInfo    = () => setActiveSection("Información");
    const goPedidos = () => setActiveSection("Pedidos");
    window.addEventListener("rixx:goto-profile-info",    goInfo);
    window.addEventListener("rixx:goto-profile-pedidos", goPedidos);
    return () => {
      window.removeEventListener("rixx:goto-profile-info",    goInfo);
      window.removeEventListener("rixx:goto-profile-pedidos", goPedidos);
    };
  }, []);

  const initials  = getInitials(currentUser?.name);
  const roleLabel = currentUser?.role === "admin" ? "Administrador" : "Cliente";

  return (
    <div className="profile-advanced">

      {/* ── Sidebar ── */}
      <aside className="profile-advanced__sidebar">

        {/* User identity */}
        <div className="profile-advanced__user">
          <div className="profile-advanced__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="profile-advanced__user-info">
            <span className="profile-advanced__user-name">
              {currentUser?.name || "Usuario"}
            </span>
            <span className="profile-advanced__user-role">{roleLabel}</span>
          </div>
        </div>

        <div className="profile-advanced__divider" aria-hidden="true" />

        {/* Nav */}
        <nav className="profile-advanced__nav" aria-label="Secciones del perfil">
          {sections.map((section) => {
            const isActive = activeSection === section.name;
            return (
              <button
                key={section.name}
                onClick={() => setActiveSection(section.name)}
                className={`profile-advanced__tab${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && <span className="profile-advanced__tab-bar" aria-hidden="true" />}
                <span className="profile-advanced__icon">{section.icon}</span>
                <span className="profile-advanced__label">{section.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Content ── */}
      <main className="profile-advanced__content">
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
      </main>
    </div>
  );
};

export default Profile;
