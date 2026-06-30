import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qhahhlnpdxpdtdrrkmvu.supabase.co",
  "sb_publishable_OHyInb1eXd9rvq7KXLaCWw_3Ejw7qZO"
);

const SECTIONS = [
  { id: "manana", label: "Manana", emoji: "🌅", tasks: [
    { id: "t1", label: "Desayunar", emoji: "🍳" },
    { id: "t2", label: "Arreglar cama", emoji: "🛏️" },
    { id: "t3", label: "Barrer", emoji: "🧹" },
    { id: "t4", label: "Trapear", emoji: "🧹" },
    { id: "t5", label: "Acompañar a comprar el almuerzo", emoji: "🛒" },
    { id: "t6", label: "Ayudar a hacer el almuerzo", emoji: "🍽️" },
    { id: "t7", label: "Hacer ejercicio", emoji: "💪" },
    { id: "t8", label: "Bañarme", emoji: "🚿" },
  ]},
  { id: "tarde", label: "Tarde", emoji: "🌤️", tasks: [
    { id: "t9", label: "Cepillarme al almuerzo", emoji: "🦷" },
    { id: "t10", label: "Practicar programación (1h)", emoji: "💻" },
    { id: "t11", label: "Leer libro (1h)", emoji: "📚" },
    { id: "t12", label: "Practicar violín (1h)", emoji: "🎻" },
  ]},
  { id: "noche", label: "Noche", emoji: "🌙", tasks: [
    { id: "t13", label: "Cepillarme en la noche", emoji: "🦷" },
  ]}
];

const ALL_IDS = SECTIONS.flatMap(s => s.tasks.map(t => t.id));
const TOTAL = ALL_IDS.length + 4;
const CATS = ["Comida","Transporte","Entretenimiento","Ropa","Salud","Educación","Otros"];
const CAT_ICONS = {"Comida":"🍔","Transporte":"🚌","Entretenimiento":"🎮","Ropa":"👕","Salud":"💊","Educación":"📚","Otros":"📦"};

function getKey() { return new Date().toISOString().slice(0, 10); }
function getMonthKey() { return new Date().toISOString().slice(0, 7); }
function fmt(n) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n); }

async function dbGet(key) {
  const { data } = await supabase.from("daily_data").select("*").eq("day_key", key);
  if (data && data.length > 0) return JSON.parse(data[0].data);
  return null;
}
async function dbSet(key, value) {
  await supabase.from("daily_data").delete().eq("day_key", key);
  await supabase.from("daily_data").insert({ day_key: key, data: JSON.stringify(value) });
}
async function dbGetAll() {
  const { data } = await supabase.from("daily_data").select("*");
  if (!data) return {};
  return data.reduce((acc, row) => { acc[row.day_key] = JSON.parse(row.data); return acc; }, {});
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [mainTab, setMainTab] = useState("tareas");
  const [taskTab, setTaskTab] = useState("hoy");
  const [finTab, setFinTab] = useState("registro");
  const [day, setDay] = useState({ checked: {}, agua: 0 });
  const [meta, setMeta] = useState({ streak: 0, lastDone: null, dark: false });
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);

  const [finType, setFinType] = useState("gasto");
  const [finAmount, setFinAmount] = useState("");
  const [finDesc, setFinDesc] = useState("");
  const [finCat, setFinCat] = useState("Comida");
  const [finWho, setFinWho] = useState("");
  const [savingMeta, setSavingMeta] = useState("");

  const today = getKey();
  const monthKey = getMonthKey();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [todayData, metaData, all] = await Promise.all([dbGet(today), dbGet("__meta__"), dbGetAll()]);
      if (todayData) setDay(todayData);
      if (metaData) { setMeta(metaData); setDark(metaData.dark || false); setSavingMeta(metaData.savingGoal || ""); }
      setAllData(all || {});
      setLoading(false);
    }
    load();
  }, []);

  async function saveDay(newDay, newMeta) {
    setSaving(true);
    await Promise.all([dbSet(today, newDay), dbSet("__meta__", newMeta || meta)]);
    setSaving(false); setSynced(true); setTimeout(() => setSynced(false), 2000);
  }

  function updateDay(newDay) {
    const allChecked = ALL_IDS.every(id => newDay.checked[id]) && newDay.agua >= 4;
    let newMeta = { ...meta };
    if (allChecked && meta.lastDone !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.toISOString().slice(0, 10);
      newMeta.streak = meta.lastDone === yk ? meta.streak + 1 : 1;
      newMeta.lastDone = today;
      setMeta(newMeta);
    }
    setDay(newDay);
    saveDay(newDay, newMeta);
  }

  function toggle(id) { updateDay({ ...day, checked: { ...day.checked, [id]: !day.checked[id] } }); }
  function tapAgua(n) { updateDay({ ...day, agua: day.agua === n ? n - 1 : n }); }

  function toggleDark() {
    const nd = !dark; setDark(nd);
    const nm = { ...meta, dark: nd }; setMeta(nm); dbSet("__meta__", nm);
  }

  async function resetTareas() {
    if (!window.confirm("¿Seguro que quieres reiniciar todas las tareas y estadísticas?")) return;
    const keys = Object.keys(allData).filter(k => k !== "__meta__");
    await Promise.all(keys.map(k => supabase.from("daily_data").delete().eq("day_key", k)));
    const newMeta = { ...meta, streak: 0, lastDone: null };
    await dbSet("__meta__", newMeta);
    setDay({ checked: {}, agua: 0 });
    setMeta(newMeta);
    setAllData({});
    setSynced(true); setTimeout(() => setSynced(false), 2000);
  }

  async function addMovimiento() {
    if (!finAmount || isNaN(Number(finAmount))) return;
    const fin = (allData[today] || {}).finanzas || { movimientos: [] };
    const mov = { id: Date.now(), tipo: finType, monto: Number(finAmount), desc: finDesc, cat: finType === "gasto" ? finCat : "Ingreso", quien: finType === "prestamo" ? finWho : "", fecha: today };
    const newFin = { ...fin, movimientos: [...fin.movimientos, mov] };
    const newDay = { ...day, finanzas: newFin };
    const newAll = { ...allData, [today]: { ...(allData[today] || {}), finanzas: newFin } };
    setDay(newDay); setAllData(newAll);
    await dbSet(today, newDay);
    setSynced(true); setTimeout(() => setSynced(false), 2000);
    setFinAmount(""); setFinDesc(""); setFinWho("");
  }

  async function deleteMovimiento(id) {
    const fin = (allData[today] || {}).finanzas || { movimientos: [] };
    const newFin = { ...fin, movimientos: fin.movimientos.filter(m => m.id !== id) };
    const newDay = { ...day, finanzas: newFin };
    const newAll = { ...allData, [today]: { ...(allData[today] || {}), finanzas: newFin } };
    setDay(newDay); setAllData(newAll);
    await dbSet(today, newDay);
  }

  async function saveSavingGoal() {
    const nm = { ...meta, savingGoal: Number(savingMeta) };
    setMeta(nm); await dbSet("__meta__", nm);
    setSynced(true); setTimeout(() => setSynced(false), 2000);
  }

  const done = ALL_IDS.filter(id => day.checked[id]).length + Math.min(day.agua, 4);
  const pct = Math.round((done / TOTAL) * 100);
  const allDays = Object.entries(allData).filter(([k]) => k !== "__meta__");
  const totalDays = Math.max(allDays.length, 1);
  const completedDays = allDays.filter(([, d]) => ALL_IDS.every(id => d.checked && d.checked[id]) && d.agua >= 4).length;

  const monthMovs = allDays.filter(([k]) => k.startsWith(monthKey)).flatMap(([, d]) => (d.finanzas?.movimientos || []));
  const totalIngresos = monthMovs.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const totalGastos = monthMovs.filter(m => m.tipo === "gasto").reduce((a, m) => a + m.monto, 0);
  const totalPrestamos = monthMovs.filter(m => m.tipo === "prestamo").reduce((a, m) => a + m.monto, 0);
  const balance = totalIngresos - totalGastos;
  const savingGoal = meta.savingGoal || 0;
  const gastoPorCat = CATS.map(cat => ({ cat, total: monthMovs.filter(m => m.tipo === "gasto" && m.cat === cat).reduce((a, m) => a + m.monto, 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const todayMovs = ((allData[today] || {}).finanzas?.movimientos) || [];

  const bg = dark ? "#0f0f13" : "#f4f3f8";
  const surf = dark ? "#1a1a24" : "#fff";
  const bdr = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const txt = dark ? "#e8e8f0" : "#1a1a2e";
  const muted = dark ? "#7a7a95" : "#8888a8";
  const accent = dark ? "#7f77dd" : "#534AB7";
  const green = "#1D9E75";
  const cardDone = dark ? "#0d2a1e" : "#eafaf4";
  const inputBg = dark ? "#2a2a3a" : "#f4f3f8";
  const inputStyle = { width: "100%", padding: "10px 12px", background: inputBg, border: `1px solid ${bdr}`, borderRadius: 10, color: txt, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const btnStyle = (color) => ({ padding: "10px 16px", background: color, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui,sans-serif" }}>
      <div style={{ fontSize: 48 }}>📋</div>
      <div style={{ fontSize: 15, color: "#7a7a95" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui,sans-serif", transition: "background 0.2s" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 80px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: txt }}>Mi App Personal</div>
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
            <button onClick={resetTareas} style={{ fontSize: 12, background: "none", border: `1px solid #E24B4A`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: "#E24B4A", fontFamily: "inherit" }}>
              Reiniciar
            </button>
          </div>
        </div>

        <div style={{ display: "flex", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
          {[["tareas","📋 Tareas"],["finanzas","💰 Finanzas"]].map(([k,l]) => (
            <button key={k} onClick={() => setMainTab(k)}
              style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", borderRadius: 10, fontFamily: "inherit", transition: "all 0.15s",
                background: mainTab === k ? (dark ? "rgba(127,119,221,0.2)" : "#534AB7") : "transparent",
                color: mainTab === k ? (dark ? "#AFA9EC" : "#fff") : muted }}>
              {l}
            </button>
          ))}
        </div>

        {mainTab === "tareas" && (
          <>
            <div style={{ display: "flex", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
              {[["hoy","Hoy"],["stats","Estadísticas"]].map(([k,l]) => (
                <button key={k} onClick={() => setTaskTab(k)}
                  style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", borderRadius: 9, fontFamily: "inherit", transition: "all 0.15s",
                    background: taskTab === k ? (dark ? "rgba(127,119,221,0.15)" : "#eeedf9") : "transparent",
                    color: taskTab === k ? accent : muted }}>
                  {l}
                </button>
              ))}
            </div>

            {taskTab === "hoy" && (
              <>
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
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

                {SECTIONS.map(sec => (
                  <div key={sec.id} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>{sec.emoji} {sec.label}</div>
                    {sec.tasks.map(t => {
                      const checked = !!day.checked[t.id];
                      return (
                        <div key={t.id} onClick={() => toggle(t.id)}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: checked ? cardDone : surf, border: `1px solid ${checked ? green : bdr}`, borderRadius: 12, cursor: "pointer", marginBottom: 6, transition: "all 0.15s", userSelect: "none" }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: `2px solid ${checked ? green : bdr}`, background: checked ? green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
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
                            style={{ width: 58, height: 58, borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
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

            {taskTab === "stats" && (
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
                  const rate = Math.round((allDays.filter(([, d]) => d.checked && d.checked[t.id]).length / totalDays) * 100);
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
          </>
        )}

        {mainTab === "finanzas" && (
          <>
            <div style={{ display: "flex", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
              {[["registro","Registrar"],["hoy","Hoy"],["mes","Este mes"],["prestamos","Préstamos"]].map(([k,l]) => (
                <button key={k} onClick={() => setFinTab(k)}
                  style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", borderRadius: 9, fontFamily: "inherit", transition: "all 0.15s",
                    background: finTab === k ? (dark ? "rgba(127,119,221,0.15)" : "#eeedf9") : "transparent",
                    color: finTab === k ? accent : muted }}>
                  {l}
                </button>
              ))}
            </div>

            {finTab === "registro" && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: txt, marginBottom: 16 }}>Nuevo movimiento</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["gasto","💸 Gasto"],["ingreso","💵 Ingreso"],["prestamo","🤝 Préstamo"]].map(([k,l]) => (
                    <button key={k} onClick={() => setFinType(k)}
                      style={{ flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${finType === k ? accent : bdr}`, borderRadius: 10, fontFamily: "inherit",
                        background: finType === k ? (dark ? "rgba(127,119,221,0.15)" : "#eeedf9") : "transparent",
                        color: finType === k ? accent : muted }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input style={inputStyle} type="number" placeholder="Monto en COP (ej: 5000)" value={finAmount} onChange={e => setFinAmount(e.target.value)} />
                  <input style={inputStyle} type="text" placeholder="Descripción (ej: Almuerzo)" value={finDesc} onChange={e => setFinDesc(e.target.value)} />
                  {finType === "gasto" && (
                    <select style={inputStyle} value={finCat} onChange={e => setFinCat(e.target.value)}>
                      {CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                    </select>
                  )}
                  {finType === "prestamo" && (
                    <input style={inputStyle} type="text" placeholder="¿A quién le prestaste?" value={finWho} onChange={e => setFinWho(e.target.value)} />
                  )}
                  <button onClick={addMovimiento} style={btnStyle(finType === "ingreso" ? green : finType === "prestamo" ? "#534AB7" : "#E24B4A")}>
                    + Agregar {finType}
                  </button>
                </div>
              </div>
            )}

            {finTab === "hoy" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Ingresos hoy", val: todayMovs.filter(m => m.tipo === "ingreso").reduce((a,m) => a+m.monto,0), color: green, icon: "💵" },
                    { label: "Gastos hoy", val: todayMovs.filter(m => m.tipo === "gasto").reduce((a,m) => a+m.monto,0), color: "#E24B4A", icon: "💸" },
                  ].map(c => (
                    <div key={c.label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "14px 12px" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{fmt(c.val)}</div>
                      <div style={{ fontSize: 11, color: muted }}>{c.label}</div>
                    </div>
                  ))}
                </div>
                {todayMovs.length === 0 ? (
                  <div style={{ textAlign: "center", color: muted, fontSize: 14, padding: 40 }}>Sin movimientos hoy</div>
                ) : (
                  todayMovs.slice().reverse().map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{m.tipo === "ingreso" ? "💵" : m.tipo === "prestamo" ? "🤝" : CAT_ICONS[m.cat] || "📦"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: txt, fontWeight: 500 }}>{m.desc || m.cat}</div>
                        <div style={{ fontSize: 11, color: muted }}>{m.tipo === "prestamo" ? `Prestado a ${m.quien}` : m.cat}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.tipo === "ingreso" ? green : m.tipo === "prestamo" ? accent : "#E24B4A" }}>{fmt(m.monto)}</div>
                        <button onClick={() => deleteMovimiento(m.id)} style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer" }}>eliminar</button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {finTab === "mes" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {[
                    { label: "Ingresos", val: totalIngresos, color: green, icon: "💵" },
                    { label: "Gastos", val: totalGastos, color: "#E24B4A", icon: "💸" },
                    { label: "Balance", val: balance, color: balance >= 0 ? green : "#E24B4A", icon: balance >= 0 ? "📈" : "📉" },
                    { label: "Prestado", val: totalPrestamos, color: accent, icon: "🤝" },
                  ].map(c => (
                    <div key={c.label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "14px 12px" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{fmt(c.val)}</div>
                      <div style={{ fontSize: 11, color: muted }}>{c.label}</div>
                    </div>
                  ))}
                </div>
                {savingGoal > 0 && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16, marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: muted }}>Meta de ahorro</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: balance >= savingGoal ? green : accent }}>{Math.round((balance / savingGoal) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: Math.min(100, Math.max(0, (balance / savingGoal) * 100)) + "%", background: `linear-gradient(90deg,#534AB7,#7f77dd)`, borderRadius: 99, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>{fmt(balance)} de {fmt(savingGoal)}</div>
                  </div>
                )}
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: txt, marginBottom: 12 }}>Meta de ahorro mensual</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Ej: 200000" value={savingMeta} onChange={e => setSavingMeta(e.target.value)} />
                    <button onClick={saveSavingGoal} style={btnStyle(green)}>Guardar</button>
                  </div>
                </div>
                {gastoPorCat.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted, marginBottom: 10 }}>Gastos por categoría</div>
                    {gastoPorCat.map(c => {
                      const p = Math.round((c.total / totalGastos) * 100);
                      return (
                        <div key={c.cat} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "10px 14px", marginBottom: 7 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                            <span style={{ color: txt }}>{CAT_ICONS[c.cat]} {c.cat}</span>
                            <span style={{ color: txt, fontWeight: 600 }}>{fmt(c.total)} <span style={{ color: muted, fontWeight: 400 }}>({p}%)</span></span>
                          </div>
                          <div style={{ height: 5, background: dark ? "rgba(255,255,255,0.06)" : "#e8e8f0", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: p + "%", background: "#E24B4A", borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {finTab === "prestamos" && (
              <>
                <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>Todos los préstamos registrados</div>
                {allDays.flatMap(([, d]) => (d.finanzas?.movimientos || []).filter(m => m.tipo === "prestamo")).length === 0 ? (
                  <div style={{ textAlign: "center", color: muted, fontSize: 14, padding: 40 }}>Sin préstamos registrados</div>
                ) : (
                  allDays.flatMap(([k, d]) =>
                    (d.finanzas?.movimientos || []).filter(m => m.tipo === "prestamo").map(m => ({ ...m, dayKey: k }))
                  ).sort((a, b) => b.id - a.id).map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>🤝</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: txt, fontWeight: 500 }}>{m.quien || "Sin nombre"}</div>
                        <div style={{ fontSize: 11, color: muted }}>{m.desc} · {m.dayKey}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{fmt(m.monto)}</div>
                    </div>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
