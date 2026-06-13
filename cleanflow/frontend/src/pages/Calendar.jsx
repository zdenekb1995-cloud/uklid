import { useState, useEffect } from "react";
import { api } from "../lib/api";

const DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTHS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday first
}

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [apartments, setApartments] = useState([]);
  const [selectedApt, setSelectedApt] = useState("all");
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    api.getApartments().then(apts => {
      setApartments(apts);
    });
  }, []);

  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const params = { month: monthStr };
    if (selectedApt !== "all") params.apartment_id = selectedApt;
    api.getReservations(params).then(setReservations).catch(console.error);
  }, [year, month, selectedApt]);

  const aptMap = {};
  apartments.forEach(a => { aptMap[a.id] = a; });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getReservationsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return reservations.filter(r => {
      return r.checkin <= dateStr && r.checkout > dateStr;
    });
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Kalendář</h1>
          <p style={{ color: "#888", marginTop: 4 }}>Souhrnný přehled rezervací.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={selectedApt} onChange={e => setSelectedApt(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fff" }}>
            <option value="all">Všechny apartmány</option>
            {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {apartments.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: a.color }} />
            <span>{a.name}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #eee", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #eee" }}>
          <button onClick={prevMonth} style={{ background: "none", border: "1px solid #eee", borderRadius: 8, padding: "6px 12px", fontSize: 16 }}>‹</button>
          <h2 style={{ fontWeight: 600, fontSize: 18 }}>{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} style={{ background: "none", border: "1px solid #eee", borderRadius: 8, padding: "6px 12px", fontSize: 16 }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #eee" }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#888" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 90, borderRight: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayRvs = getReservationsForDay(day);
            const todayStyle = isToday(day) ? { fontWeight: 700, color: "#002FA7" } : {};
            return (
              <div key={day} style={{
                minHeight: 90, padding: "6px 8px",
                borderRight: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0",
                background: isToday(day) ? "#f0f4ff" : "#fff"
              }}>
                <div style={{ fontSize: 13, marginBottom: 4, ...todayStyle }}>
                  {day}
                  {isToday(day) && <span style={{ fontSize: 9, marginLeft: 3, color: "#002FA7", fontWeight: 700 }}>DNES</span>}
                </div>
                {dayRvs.slice(0, 3).map((r, ri) => {
                  const apt = aptMap[r.apartment_id];
                  return (
                    <div key={ri} title={`${apt?.name || "?"}: ${r.summary}`} style={{
                      fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2,
                      background: apt?.color || "#ccc", color: "#fff", overflow: "hidden",
                      whiteSpace: "nowrap", textOverflow: "ellipsis", opacity: r.blocked ? 0.6 : 1
                    }}>
                      {r.blocked ? "🔒 " : ""}{apt?.name || r.summary}
                    </div>
                  );
                })}
                {dayRvs.length > 3 && <div style={{ fontSize: 10, color: "#999" }}>+{dayRvs.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {reservations.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa", marginTop: 16 }}>
          <p>Žádné rezervace v tomto měsíci. Zkuste synchronizovat apartmány.</p>
        </div>
      )}
    </div>
  );
}
