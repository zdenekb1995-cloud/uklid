import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function CleanerView() {
  const [tasks, setTasks] = useState([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getCleaningsForCleaner().then(setTasks).catch(console.error);
  }, []);

  const handleDone = async (id) => {
    await api.updateCleaning(id, { status: "done" });
    setTasks(t => t.filter(x => x.id !== id));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb" }}>
      <div style={{ background: "#002FA7", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✦</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>CleanFlow</span>
        </div>
        <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>
          Odhlásit
        </button>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Moje úklidové úkoly</h2>
        <p style={{ color: "#888", marginBottom: 24 }}>Nadcházející úklidy</p>
        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p>Žádné nadcházející úklidové úkoly.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 12, border: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{task.apartment_name}</div>
                  <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
                    📅 Checkout: {new Date(task.checkout_date + "T12:00:00").toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                </div>
                <button onClick={() => handleDone(task.id)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#4CAF50", color: "#fff", fontSize: 14, fontWeight: 600
                }}>
                  ✓ Hotovo
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
