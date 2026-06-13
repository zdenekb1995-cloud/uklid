import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Cleaners() {
  const [cleaners, setCleaners] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const load = () => api.getCleaners().then(setCleaners);
  useEffect(() => { load(); }, []);

  const openModal = (c = null) => {
    setForm(c || { name: "", phone: "", email: "", notes: "" });
    setModal(c || "new");
  };

  const handleSave = async () => {
    if (modal?.id) {
      await api.updateCleaner(modal.id, form);
    } else {
      await api.createCleaner(form);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Smazat uklízečku?")) return;
    await api.deleteCleaner(id);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Uklízečky</h1>
          <p style={{ color: "#888", marginTop: 4 }}>Správa pracovního týmu.</p>
        </div>
        <button onClick={() => openModal()} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "#002FA7", color: "#fff", fontSize: 14, fontWeight: 600
        }}>
          + Přidat uklízečku
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {cleaners.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: "#002FA7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 18
                }}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 13, color: "#888" }}>{c.phone}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openModal(c)} style={{ background: "none", border: "none", fontSize: 16 }}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", fontSize: 16 }}>🗑️</button>
              </div>
            </div>
            {c.email && <div style={{ fontSize: 13, color: "#888" }}>✉️ {c.email}</div>}
            {c.notes && <div style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>{c.notes}</div>}
            {c.phone && (
              <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-block", marginTop: 12, padding: "6px 12px", borderRadius: 8, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 500 }}>
                📱 WhatsApp
              </a>
            )}
          </div>
        ))}
        {cleaners.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <p>Žádné uklízečky. Přidejte první.</p>
          </div>
        )}
      </div>

      {modal !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 24 }}>{modal?.id ? "Upravit" : "Přidat"} uklízečku</h3>
            {[["Jméno", "name", "Petra Nováková"], ["Telefon (WhatsApp)", "phone", "+420 777 123 456"], ["E-mail", "email", "petra@email.cz"], ["Poznámka", "notes", ""]].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6 }}>{label.toUpperCase()}</label>
                <input value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #eee", background: "#fff", fontSize: 14 }}>Zrušit</button>
              <button onClick={handleSave} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#002FA7", color: "#fff", fontSize: 14, fontWeight: 600 }}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
