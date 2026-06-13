import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "cleaner" ? "/cleaner" : "/apartments");
    } catch (err) {
      setError(err.message || "Přihlášení selhalo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{
        flex: 1, background: "linear-gradient(135deg, #002FA7 0%, #0050d0 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: 60, color: "#fff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20 }}>✦</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700 }}>CleanFlow</span>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
          Jeden systém pro<br />úklid všech<br />vašich apartmánů.
        </h1>
        <p style={{ fontSize: 16, opacity: 0.75 }}>Synchronizace s Booking.com a Airbnb.</p>
      </div>
      <div style={{
        width: 480, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 48, background: "#fff"
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#999", marginBottom: 8 }}>PŘIHLÁŠENÍ</p>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Vítejte zpět</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, letterSpacing: 0.5 }}>UŽIVATELSKÉ JMÉNO</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Nikola"
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 15, outline: "none", background: "#f8f9fb" }}
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, letterSpacing: 0.5 }}>HESLO</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 15, outline: "none", background: "#f8f9fb" }}
                required
              />
            </div>
            {error && <div style={{ background: "#fff0f0", color: "#c00", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: "#002FA7", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? "Přihlašuji..." : "Přihlásit se"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
