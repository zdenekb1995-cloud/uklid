import { useState, useEffect } from "react";
import { api } from "../lib/api";

const STATUS_LABELS = { pending: "Čeká", scheduled: "Naplánováno", done: "Hotovo" };
const STATUS_COLORS = { pending: "#FF9800", scheduled: "#2196F3", done: "#4CAF50" };

export default function Cleanings() {
  const [tasks, setTasks] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [t, c] = await Promise.all([api.getCleanings(), api.getCleaners()]);
    setTasks(t);
    setCleaners(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAssign = async (taskId, cleanerId) => {
    const cleaner = cleaners.find(c => c.id === cleanerId);
    await api.updateCleaning(taskId, {
      cleaner_id: cleanerId || null,
      status: cleanerId ? "scheduled" : "pending",
      cleaner_name: cleaner?.name || null,
    });
    load();
  };

  const handleDone = async (taskId) => {
    await api.updateCleaning(taskId, { status: "done" });
    load();
  };

  const handleWhatsApp = (task) => {
    const cleaner = cleaners.find(c => c.id === task.cleaner_id);
    if (!cleaner?.phone) return alert("Uklízečka nemá telefon");
    const phone = cleaner.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Dobrý den, prosím o úklid apartmánu ${task.apartment_name} dne ${task.checkout_date}. Děkuji!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const grouped = {};
  tasks.forEach(t => {
    if (!grouped[t.checkout_date]) grouped[t.checkout_date] = [];
    grouped[t.checkout_date].push(t);
  });

  if (loading) return <div style={{ padding: 40, color: "#aaa" }}>Načítání...</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Úklid</h1>
        <p style={{ color: "#888", marginTop: 4 }}>Plánování úklidů po checkout.</p>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧹</div>
          <p>Žádné úklidové úkoly. Synchronizujte apartmány v sekci Apartmány.</p>
        </div>
      )}

      {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([date, dayTasks]) => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16 }}>
              {new Date(date + "T12:00:00").toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <span style={{ fontSize: 12, color: "#888", background: "#f0f0f0", padding: "2px 8px", borderRadius: 20 }}>
              {dayTasks.length} úklidů
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dayTasks.map(task => (
              <div key={task.id} style={{
                background: "#fff", borderRadius: 12, padding: "16px 20px",
                border: "1px solid #eee", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
              }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: task.apartment_color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{task.apartment_name}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{task.summary || "Rezervace"}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: STATUS_COLORS[task.status] + "22", color: STATUS_COLORS[task.status]
                }}>
                  {STATUS_LABELS[task.status]}
                </span>
                <select
                  value={task.cleaner_id || ""}
                  onChange={e => handleAssign(task.id, e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, background: "#fff" }}
                >
                  <option value="">— Přiřadit uklízečku —</option>
                  {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {task.cleaner_id && (
                  <button onClick={() => handleWhatsApp(task)} style={{
                    padding: "6px 12px", borderRadius: 8, border: "none",
                    background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 500
                  }}>
                    📱 WhatsApp
                  </button>
                )}
                {task.status !== "done" && (
                  <button onClick={() => handleDone(task.id)} style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid #4CAF50",
                    background: "#fff", color: "#4CAF50", fontSize: 13, fontWeight: 500
                  }}>
                    ✓ Hotovo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
