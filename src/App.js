import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qhahhlnpdxpdtdrrkmvu.supabase.co",
  "sb_publishable_OHyInb1eXd9rvq7KXLaCWw_3Ejw7qZO"
);

const SECTIONS = [
  {
    id: "manana", label: "Manana", emoji: "🌅",
    tasks: [
      { id: "t1", label: "Desayunar", emoji: "🍳" },
      { id: "t2", label: "Arreglar cama", emoji: "🛏️" },
      { id: "t3", label: "Barrer", emoji: "🧹" },
      { id: "t4", label: "Trapear", emoji: "🧹" },
      { id: "t5", label: "Acompañar a comprar el almuerzo", emoji: "🛒" },
      { id: "t6", label: "Ayudar a hacer el almuerzo", emoji: "🍽️" },
      { id: "t7", label: "Hacer ejercicio", emoji: "💪" },
      { id: "t8", label: "Bañarme", emoji: "🚿" },
    ]
  },
  {
    id: "tarde", label: "Tarde", emoji: "🌤️",
    tasks: [
      { id: "t9", label: "Cepillarme al almuerzo", emoji: "🦷" },
      { id: "t10", label: "Practicar programación (1h)", emoji: "💻" },
      { id: "t11", label: "Leer libro (1h)", emoji: "📚" },
      { id: "t12", label: "Practicar violín (1h)", emoji: "🎻" },
    ]
  },
  {
    id: "noche", label: "Noche", emoji: "🌙",
    tasks: [
      { id: "t13", label: "Cepillarme en la noche", emoji: "🦷" },
    ]
  }
];

const ALL_IDS = SECTIONS.flatMap(s => s.tasks.map(t => t.id));
const TOTAL = ALL_IDS.length + 4;

function getKey() { return new Date().toISOString().slice(0, 10); }

async function dbGet(key) {
  const { data } = await supabase.from("daily_data").select("*").eq("day_key", key);
  if (data && data.length > 0) return JSON.parse(data[0].data);
  return null;
}

async function dbSet(key, value) {
  await supabase.from("daily_data").delete().eq("day_key", key);
  await supabase.from("daily_data").insert({ day_key: key, data: JSON.stringify(value) });
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("hoy");
  const [day, setDay] = useState({ checked: {}, agua: 0 });
  const [meta, setMeta] = useState({ streak: 0, lastDone: null, allDays: {}, dark: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);

  const today = getKey();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [todayData, metaData] = await Promise.all([dbGet(today), dbGet("__meta__")]);
      if (todayData) setDay(todayData);
      if (metaData) { setMeta(metaData); setDark(metaData.dark || false); }
      setLoading(false);
    }
    load();
  }, []);

  async function saveAll(newDay, newMeta) {
    setSaving(true);
    await Promise.all([dbSet(today, newDay), dbSet("__meta__", newMeta)]);
    setSaving(false);
    setSynced(true);
    setTimeout(() => setSynced(false), 2000);
  }

  function updateDay(newDay) {
    const allChecked = ALL_IDS.every(id => newDay.checked[id]) && newDay.agua >= 4;
    const newAllDays = { ...meta.allDays, [today]: { checked: newDay.checked, agua: newDay.agua } };
    let newStreak = meta.streak, newLast = meta.lastDone;
    if (allChecked && meta.lastDone !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.toISOString().slice(0, 10);
      newStreak = meta.lastDone === yk ? meta.streak + 1 : 1;
      newLast = today;
    }
    const newMeta = { ...meta, streak: newStreak, lastDone: newLast, allDays: newAllDays };
    setDay(newDay);
    setMeta(newMeta);
    saveAll(newDay, newMeta);
  }

  function toggle(id) {
    updateDay({ ...day, checked: { ...day.checked, [id]: !day.checked[id] } });
  }

  function tapAgua(n) {
    updateDay({ ...day, agua: day.agua === n ? n - 1 : n });
  }

  function toggleDark() {
    const nd = !dark;
    setDark(nd);
    const newMeta = { ...meta, dark: nd };
    setMeta(newMeta);
    dbSet("__meta__", newMeta);
  }

  const done = ALL_IDS.filter(id => day.checked[id]).length + Math.min(day.agua, 4);
  const pct = Math.round((done / TOTAL) * 100);
  const allDays = Object.values(meta.allDays || {});
  const totalDays = Math.max(Object.keys(meta.allDays || {}).length, 1);
  const completedDays = allDays.filter(d => ALL_IDS.every(id => d.checked && d.checked[id]) && d.agua >= 4).length;

  const bg = dark ? "#0f0f13" : "#f4f3f8";
  const surf = dark ? "#1a1a24" : "#fff";
  const bdr = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const txt = dark ? "#e8e8f0" : "#1a1a2e";
  const muted = dark ? "#7a7a95" : "#8888a8";
  const accent = dark ? "#7f77dd" : "#534AB7";
  const green = "#1D9E75";
  const cardDone = dark ? "#0d2a1e" : "#eafaf4";

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui,sans-serif" }}>
      <div style={{ fontSize: 48 }}>📋</div>
      <div style={{ fontSize: 15, color: "#7a7a95" }}>Cargando desde la nube...</div>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui,sans-serif", transition: "background 0.2s" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: txt }}>Mis Responsabilidades</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {synced && <span style={{ fontSize: 11, color: green, fontWeight: 500 }}>✓ Guardado</span>}
            {saving && <span style={{ fontSize: 11, color: muted }}>Guardando...</span>}
            <button onClick={toggleDark} style={{ fontSize: 20, background: "none", border: `1px solid ${bdr}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "8px 12px", background: dark ? "rgba(29,158,117,0.1)" : "#E1F5EE", borderRadius: 10, border: `1px solid ${dark ? "rgba(29,158,117,0.2)" : "#b2e4d4"}` }}>
          <span>☁️</span>
          <span style={{ fontSize: 12, color: green, fontWeight: 500 }}>Sincronizada — celular y PC</span>
        </div>

        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: muted }}>Progreso del día</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: pct === 100 ? green : accent }}>{pct}%</span>
          </div>
          <div style={{ height: 10, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? `linear-gradient(90deg,${green},#5DCAA5)` : `linear-gradient(90deg,#534AB7,#7f77dd)`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: muted }}>
            <span>{done} de {TOTAL} tareas</span>
            {pct === 100 && <span style={{ color: green, fontWeight: 600 }}>🎉 ¡Día completo!</span>}
          </div>
        </div>

        <div style={{ display: "flex", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[["hoy", "📋 Hoy"], ["stats", "📊 Estadísticas"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", borderRadius: 9, fontFamily: "inherit", transition: "all 0.15s",
                background: tab === k ? (dark ? "rgba(127,119,221,0.2)" : "#534AB7") : "transparent",
                color: tab === k ? (dark ? "#AFA9EC" : "#fff") : muted }}>
              {l}
            </button>
          ))}
        </div>

        {tab === "hoy" && (
          <>
            {SECTIONS.map(sec => (
              <div key={sec.id} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
                  {sec.emoji} {sec.label}
                </div>
                {sec.tasks.map(t => {
                  const checked = !!day.checked[t.id];
                  return (
                    <div key={t.id} onClick={() => toggle(t.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                        background: checked ? cardDone : surf, border: `1px solid ${checked ? green : bdr}`,
                        borderRadius: 12, cursor: "pointer", marginBottom: 6, transition: "all 0.15s", userSelect: "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${checked ? green : bdr}`, background: checked ? green : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, transition: "all 0.15s" }}>
                        {checked ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 18 }}>{t.emoji}</span>
                      <span style={{ flex: 1, fontSize: 14, color: checked ? muted : txt, textDecoration: checked ? "line-through" : "none" }}>{t.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>💧 Agua del día</div>
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
                  {[1,2,3,4].map(n => {
                    const on = day.agua >= n;
                    return (
                      <div key={n} onClick={() => tapAgua(n)}
                        style={{ width: 58, height: 58, borderRadius: 14, cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          background: on ? (dark ? "rgba(29,158,117,0.2)" : "#E1F5EE") : (dark ? "rgba(255,255,255,0.04)" : "#f4f3f8"),
                          border: `1.5px solid ${on ? green : bdr}`, transition: "all 0.15s", userSelect: "none", gap: 2 }}>
                        <span style={{ fontSize: 22 }}>{on ? "💧" : "○"}</span>
                        <span style={{ fontSize: 10, color: on ? green : muted }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "center", fontSize: 13, color: muted }}>{day.agua} de 4 tomas completadas</div>
              </div>
            </div>
          </>
        )}

        {tab === "stats" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[["✅", completedDays, "Días completos"], ["🔥", meta.streak, "Racha actual"], ["📅", totalDays, "Días totales"]].map(([ic, v, l]) => (
                <div key={l} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{ic}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: txt, margin: "4px 0" }}>{v}</div>
                  <div style={{ fontSize: 11, color: muted }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted, marginBottom: 10 }}>Completado por tarea</div>
            {SECTIONS.flatMap(s => s.tasks).map(t => {
              const rate = Math.round((allDays.filter(d => d.checked && d.checked[t.id]).length / totalDays) * 100);
              const col = rate >= 80 ? green : rate >= 50 ? "#BA7517" : "#E24B4A";
              return (
                <div key={t.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "10px 14px", marginBottom: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: txt }}>{t.emoji} {t.label}</span>
                    <span style={{ color: col, fontWeight: 600 }}>{rate}%</span>
                  </div>
                  <div style={{ height: 5, background: dark ? "rgba(255,255,255,0.06)" : "#e8e8f0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: rate + "%", background: col, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
