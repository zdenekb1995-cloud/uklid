import { useState, useEffect } from "react";
import { api } from "../lib/api";

const COLORS = ["#002FA7","#FF5722","#4CAF50","#FFC107","#E91E63","#9C27B0","#00BCD4","#FF9800"];

const SYNC_LABELS = {
  forbidden: "Přístup odepřen (403)",
  invalid_token: "Neplatný token – obnov odkaz",
  timeout: "Vypršel čas spojení",
  fetch_error: "Nepodařilo se stáhnout",
  no_calendar: "Odpověď není kalendář",
  empty_url: "Chybí odkaz",
};

function SyncBadge({ source, st }) {
  const label = source === "booking" ? "Booking" : "Airbnb";
  if (!st) return <span style={{ fontSize: 12, color: "#aaa" }}>{label}: —</span>;
  if (st.ok) return (
    <span style={{ fontSize: 12, color: "#2e7d32", display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
      {label}: {st.reservations} rezervací{st.blocked ? `, ${st.blocked} blokací` : ""}
    </span>
  );
  return (
    <span style={{ fontSize: 12, color: "#c62828", display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f44336", display: "inline-block" }} />
      {label}: {SYNC_LABELS[st.error] || st.error}
    </span>
  );
}

function AptModal({ apt, onClose, onSave }) {
  const [form, setForm] = useState(apt || {
    name: "", color: "#002FA7", checkin_time: "15:00", checkout_time: "11:00",
    ical_booking: "", ical_airbnb: ""
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 480, maxHeight: "90vh", overflow: "auto" }}>
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 24 }}>{apt ? "Upravit apartmán" : "Přidat apartmán"}</h3>
        {[
          ["Název", "name", "text", "Letců 29"],
          ["Check-in čas", "checkin_time", "text", "15:00"],
          ["Check-out čas", "checkout_time", "text", "11:00"],
          ["Booking.com iCal URL", "ical_booking", "url", "https://ical.booking.com/v1/export?t=..."],
          ["Airbnb iCal URL", "ical_airbnb", "url", "https://www.airbnb.cz/calendar/ical/..."],
        ].map(([label, key, type, ph]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6 }}>{label.toUpperCase()}</label>
            <input
              type={type} value={form[key] || ""} placeholder={ph}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14 }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6 }}>BARVA</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setForm({ ...form, color: c })} style={{
                width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                border: form.color === c ? "3px solid #000" : "2px solid transparent"
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #eee", background: "#fff", fontSize: 14 }}>Zrušit</button>
          <button onClick={() => onSave(form)} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#002FA7", color: "#fff", fontSize: 14, fontWeight: 600 }}>Uložit</button>
        </div>
      </div>
    </div>
  );
}

export default function Apartments() {
  const [apartments, setApartments] = useState([]);
  const [modal, setModal] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [syncAll, setSyncAll] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => api.getApartments().then(setApartments).catch(console.error);
  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleSave = async (form) => {
    if (modal?.id) {
      await api.updateApartment(modal.id, form);
    } else {
      await api.createApartment(form);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Smazat apartmán?")) return;
    await api.deleteApartment(id);
    load();
  };

  const handleSync = async (id) => {
    setSyncing(s => ({ ...s, [id]: true }));
    try {
      await api.syncApartment(id);
      showToast("Synchronizace dokončena");
      load();
    } catch (e) {
      showToast("Chyba: " + e.message);
    } finally {
      setSyncing(s => ({ ...s, [id]: false }));
    }
  };

  const handleSyncAll = async () => {
    setSyncAll(true);
    try {
      await api.syncAll();
      showToast("Synchronizace všech dokončena");
      load();
    } catch (e) {
      showToast("Chyba: " + e.message);
    } finally {
      setSyncAll(false);
    }
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: "#002FA7", color: "#fff", padding: "12px 20px", borderRadius: 10, zIndex: 300, fontSize: 14, fontWeight: 500 }}>
          ✓ {toast}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Apartmány</h1>
          <p style={{ color: "#888", marginTop: 4 }}>Spravujte své pronajímané jednotky.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleSyncAll} disabled={syncAll} style={{
            padding: "10px 18px", borderRadius: 10, border: "1.5px solid #e0e0e0",
            background: "#fff", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6
          }}>
            {syncAll ? "⟳ Synchronizuji..." : "⟳ Synchronizovat vše"}
          </button>
          <button onClick={() => setModal({})} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#002FA7", color: "#fff", fontSize: 14, fontWeight: 600
          }}>
            + Přidat apartmán
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {apartments.map(apt => (
          <div key={apt.id} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: apt.color, flexShrink: 0 }} />
                <h3 style={{ fontWeight: 600, fontSize: 16 }}>{apt.name}</h3>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setModal(apt)} style={{ background: "none", border: "none", fontSize: 16, padding: 2 }}>✏️</button>
                <button onClick={() => handleDelete(apt.id)} style={{ background: "none", border: "none", fontSize: 16, padding: 2 }}>🗑️</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              IN {apt.checkin_time} → OUT {apt.checkout_time}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              {apt.ical_booking && <SyncBadge source="booking" st={apt.sync_status?.booking} />}
              {apt.ical_airbnb && <SyncBadge source="airbnb" st={apt.sync_status?.airbnb} />}
            </div>
            {apt.last_synced && (
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 12 }}>
                Naposledy: {new Date(apt.last_synced).toLocaleString("cs-CZ")}
              </div>
            )}
            <button onClick={() => handleSync(apt.id)} disabled={syncing[apt.id]} style={{
              background: "none", border: "none", color: "#002FA7", fontSize: 13,
              fontWeight: 500, padding: 0, display: "flex", alignItems: "center", gap: 4
            }}>
              {syncing[apt.id] ? "Synchronizuji..." : "⟳ Synchronizovat"}
            </button>
          </div>
        ))}
        {apartments.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
            <p>Žádné apartmány. Přidejte první.</p>
          </div>
        )}
      </div>

      {modal !== null && <AptModal apt={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
