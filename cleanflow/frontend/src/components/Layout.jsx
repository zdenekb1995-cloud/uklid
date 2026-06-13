import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const nav = [
  { to: "/apartments", label: "Apartmány", icon: "🏠" },
  { to: "/calendar", label: "Kalendář", icon: "📅" },
  { to: "/cleanings", label: "Úklid", icon: "🧹" },
  { to: "/cleaners", label: "Uklízečky", icon: "👤" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: 220, background: "#fff", borderRight: "1px solid #eee",
        display: "flex", flexDirection: "column", position: "fixed",
        top: 0, left: 0, bottom: 0, zIndex: 100
      }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, background: "#002FA7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 16 }}>✦</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#002FA7" }}>CleanFlow</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {nav.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, marginBottom: 2, fontWeight: 500, fontSize: 14,
              background: isActive ? "#002FA7" : "transparent",
              color: isActive ? "#fff" : "#555",
              transition: "all 0.15s"
            })}>
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
            Přihlášen jako <strong>{user?.sub}</strong>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: "1px solid #eee", background: "#fff", color: "#666",
            fontSize: 13, fontWeight: 500
          }}>
            Odhlásit se
          </button>
        </div>
      </aside>
      <main style={{ marginLeft: 220, flex: 1, padding: 32, minHeight: "100vh" }}>
        <Outlet />
      </main>
    </div>
  );
}
