"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Dumbbell, HeartPulse, House, LogOut, Menu, Pencil, Plus, Ruler, Save, Settings2, Sparkles, Target, Timer, Trash2, TrendingUp, X } from "lucide-react";
import { loadMyFitData, saveMyFitData, type SupabaseSession } from "./supabase-client";

type Exercise = { name: string; sets: number; reps: string; rest: string; note?: string };
type Day = { title: string; subtitle: string; exercises: Exercise[]; cardio?: string; note?: string };
type Entry = { weight: string; reps: string; done: boolean };
type AppData = { program: Day[]; logs: Record<string, Record<string, Entry[]>>; sessions: Record<string, { done: boolean; note: string }>; measures: { date: string; weight: string; waist: string; hip: string; thigh: string }[]; weekly: Record<string, { recovery: string; notes: string }> };

const initialProgram: Day[] = [
  { title: "Glúteos e quadríceps", subtitle: "SEGUNDA-FEIRA · TREINO A", note: "Priorize a técnica na elevação pélvica e controle o movimento durante os agachamentos.", exercises: [
    { name: "Elevação pélvica com barra", sets: 4, reps: "8–10", rest: "90–120 s" }, { name: "Agachamento no Smith", sets: 3, reps: "8–12", rest: "90–120 s" }, { name: "Leg press 45°", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Cadeira extensora", sets: 3, reps: "12–15", rest: "60–90 s" }, { name: "Cadeira abdutora", sets: 2, reps: "15–20", rest: "60–90 s" },
  ] },
  { title: "Costas, bíceps e cardio", subtitle: "TERÇA-FEIRA · TREINO B", cardio: "20–30 min de caminhada inclinada ou bicicleta em intensidade moderada.", exercises: [
    { name: "Puxada frontal", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Remada baixa", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Remada unilateral", sets: 2, reps: "10–12", rest: "60–90 s" }, { name: "Crucifixo inverso", sets: 2, reps: "12–15", rest: "60–90 s" }, { name: "Rosca direta", sets: 3, reps: "10–12", rest: "60–90 s" }, { name: "Rosca martelo", sets: 2, reps: "12", rest: "60–90 s" },
  ] },
  { title: "Glúteos e posteriores", subtitle: "QUARTA-FEIRA · TREINO C", note: "Controle a descida do stiff, mantenha a coluna neutra e respeite sua mobilidade.", exercises: [
    { name: "Stiff ou terra romeno", sets: 3, reps: "8–10", rest: "90–120 s" }, { name: "Mesa flexora", sets: 3, reps: "10–12", rest: "60–90 s" }, { name: "Afundo reverso", sets: 2, reps: "10 por perna", rest: "90–120 s" }, { name: "Coice na polia", sets: 2, reps: "12–15", rest: "60–90 s" }, { name: "Cadeira abdutora", sets: 2, reps: "15–20", rest: "60–90 s" },
  ] },
  { title: "Superiores e abdômen", subtitle: "QUINTA-FEIRA · TREINO D", cardio: "20–30 min de caminhada ou elíptico em intensidade moderada.", exercises: [
    { name: "Supino na máquina", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Desenvolvimento com halteres", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Elevação lateral", sets: 3, reps: "12–15", rest: "60–90 s" }, { name: "Tríceps na polia", sets: 3, reps: "10–12", rest: "60–90 s" }, { name: "Tríceps francês", sets: 2, reps: "12", rest: "60–90 s" }, { name: "Abdominal na máquina", sets: 3, reps: "12–15", rest: "60–90 s" }, { name: "Prancha", sets: 3, reps: "30–45 s", rest: "60–90 s" },
  ] },
  { title: "Glúteos · estímulo complementar", subtitle: "SEXTA-FEIRA · TREINO E", note: "O leg press unilateral substitui o agachamento búlgaro para uma execução mais estável.", exercises: [
    { name: "Elevação pélvica", sets: 3, reps: "10–12", rest: "90–120 s" }, { name: "Leg press unilateral", sets: 2, reps: "10–12 por perna", rest: "90–120 s" }, { name: "Cadeira abdutora", sets: 2, reps: "15–20", rest: "60–90 s" }, { name: "Panturrilha na máquina", sets: 3, reps: "12–15", rest: "60–90 s" },
  ] },
];
const todayIndex = () => { const d = new Date().getDay(); return d === 0 ? 0 : Math.min(d - 1, 4); };
const todayKey = () => new Date().toLocaleDateString("en-CA");
const fresh = (): AppData => ({ program: initialProgram, logs: {}, sessions: {}, measures: [], weekly: {} });
const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const keyFor = (date: Date) => date.toLocaleDateString("en-CA");

export function MyFitApp({ userName, projectUrl, publishableKey, session, onLogout }: { userName: string; projectUrl: string; publishableKey: string; session: SupabaseSession; onLogout: () => void }) {
  const [data, setData] = useState<AppData>(fresh);
  const [storageReady, setStorageReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState("Treino");
  const [selectedDay, setSelectedDay] = useState(todayIndex());
  const [date, setDate] = useState(new Date());
  const [saved, setSaved] = useState(storageReady);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Exercise | null>(null);
  const [measureDraft, setMeasureDraft] = useState({ weight: "", waist: "", hip: "", thigh: "" });
  const [weekNote, setWeekNote] = useState({ recovery: "", notes: "" });

  useEffect(() => {
    let live = true;
    loadMyFitData(projectUrl, publishableKey, session)
      .then((result) => {
        if (!live) return;
        if (result && typeof result === "object") setData({ ...fresh(), ...(result as Partial<AppData>) });
        setStorageReady(true);
        setLoaded(true);
      })
      .catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [projectUrl, publishableKey, session.access_token]);

  useEffect(() => {
    if (!storageReady || !loaded) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      setSaved(false);
      try { await saveMyFitData(projectUrl, publishableKey, session, data); if (live) setSaved(true); }
      catch { if (live) setSaved(false); }
    }, 500);
    return () => { live = false; window.clearTimeout(timer); };
  }, [data, storageReady, loaded, projectUrl, publishableKey, session.access_token]);

  const activeDay = data.program[selectedDay] ?? initialProgram[selectedDay];
  const dateId = keyFor(date);
  const entries = data.logs[dateId] ?? {};
  const completedExercises = activeDay.exercises.filter((e) => entries[e.name]?.length === e.sets && entries[e.name].every((s) => s.done)).length;
  const completedSets = Object.values(entries).flat().filter((s) => s.done).length;
  const allSets = activeDay.exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedDays = Object.entries(data.sessions).filter(([k, v]) => v.done && new Date(`${k}T12:00:00`).getDay() >= 1 && new Date(`${k}T12:00:00`).getDay() <= 5).length;
  const progress = Math.min(100, Math.round(completedDays / 40 * 100));
  const weekNum = Math.min(8, Math.max(1, Math.floor(completedDays / 5) + 1));
  const weeklyProgress = Math.min(100, Math.round((completedDays % 5) / 5 * 100));

  const notify = (s: string) => { setToast(s); window.setTimeout(() => setToast(""), 2300); };
  const updateEntry = (exercise: Exercise, idx: number, field: keyof Entry, value: string | boolean) => setData((old) => {
    const dayLogs = { ...(old.logs[dateId] ?? {}) };
    const rows = [...(dayLogs[exercise.name] ?? Array.from({ length: exercise.sets }, () => ({ weight: "", reps: "", done: false })))];
    rows[idx] = { ...rows[idx], [field]: value } as Entry;
    dayLogs[exercise.name] = rows;
    return { ...old, logs: { ...old.logs, [dateId]: dayLogs } };
  });
  const finishSession = () => { setData((old) => ({ ...old, sessions: { ...old.sessions, [dateId]: { ...(old.sessions[dateId] ?? { note: "" }), done: true } } })); notify("Treino concluído. Mandou bem!"); };
  const moveWeek = (n: number) => { const next = new Date(date); next.setDate(next.getDate() + 7 * n); setDate(next); setSelectedDay(next.getDay() === 0 ? 0 : Math.min(next.getDay() - 1, 4)); };
  const saveExercise = () => { if (editing === null || !editDraft) return; setData((old) => { const program = old.program.map((d) => ({ ...d, exercises: [...d.exercises] })); program[selectedDay].exercises[editing] = editDraft; return { ...old, program }; }); setEditing(null); setEditDraft(null); notify("Exercício atualizado"); };
  const addMeasure = () => { if (!Object.values(measureDraft).some(Boolean)) return; setData((old) => ({ ...old, measures: [...old.measures, { ...measureDraft, date: todayKey() }] })); setMeasureDraft({ weight: "", waist: "", hip: "", thigh: "" }); notify("Medidas registradas"); };
  const saveWeek = () => { setData((old) => ({ ...old, weekly: { ...old.weekly, [String(weekNum)]: weekNote } })); notify("Acompanhamento salvo"); };

  return <div className="app-shell">
    <aside className="side-nav"><a className="brand" href="#"><span className="brand-mark"><Activity size={20}/></span><span>my<span className="brand-lilac">fit</span><small>MEU TREINO, MINHA EVOLUÇÃO</small></span></a>
      <p className="nav-label">MENU</p><NavButton icon={<Dumbbell size={18}/>} label="Meu treino" active={section === "Treino"} onClick={() => setSection("Treino")}/><NavButton icon={<ChartNoAxesColumnIncreasing size={18}/>} label="Evolução" active={section === "Evolução"} onClick={() => setSection("Evolução")}/><NavButton icon={<Ruler size={18}/>} label="Medidas" active={section === "Medidas"} onClick={() => setSection("Medidas")}/><NavButton icon={<CalendarDays size={18}/>} label="Histórico" active={section === "Histórico"} onClick={() => setSection("Histórico")}/>
      <div className="side-bottom"><div className="privacy-card"><div className="privacy-icon"><HeartPulse size={17}/></div><strong>Seu espaço, seu ritmo</strong><p>Seus registros são privados e vinculados à sua conta.</p></div><button className="account" onClick={onLogout}><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><span><b>{userName.split("@")[0]}</b><small>{userName}</small></span><LogOut size={16}/></button></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="mobile-brand" onClick={() => setSection("Treino")}><span className="brand-mark"><Activity size={18}/></span><b>my<span className="brand-lilac">fit</span></b></button><div className="crumb">Minha jornada <ChevronRight size={14}/> <b>{section}</b></div><div className="top-right"><span className="sync"><span className={saved ? "sync-dot" : "sync-dot pending"}/>{storageReady ? (saved ? "Salvo" : "Salvando") : "Configurar dados"}</span><button className="avatar small-avatar" aria-label="Perfil">{userName.slice(0,1).toUpperCase()}</button></div></header>
      <div className="content">
        {!storageReady && <div className="setup-alert"><Settings2 size={17}/><span><b>Falta conectar o armazenamento seguro.</b> Os registros desta sessão ainda não serão salvos. Veja as instruções de configuração do MyFit.</span></div>}
        {section === "Treino" && <>
          <div className="eyebrow">SEGUNDA A SEXTA <span>·</span> CICLO DE 8 SEMANAS</div><div className="welcome-row"><div><h1>Olá, {userName.split(" ")[0]} <span className="wave">✦</span></h1><p className="muted">Consistência de hoje, evolução de amanhã.</p></div><button className="week-chip" onClick={() => setSection("Evolução")}><span className="week-icon"><Target size={17}/></span><span><b>Semana {weekNum}</b><small>de 8 semanas</small></span><ChevronDown size={16}/></button></div>
          <div className="week-track"><div><span>PROGRESSO DO CICLO</span><b>{progress}%</b></div><div className="track"><i style={{ width: `${progress}%` }}/></div><div className="week-track-foot"><span>Semana {weekNum} de 8</span><span>{completedDays} treinos concluídos</span></div></div>
          <div className="day-tabs">{dayLabels.map((d, i) => <button key={d} className={selectedDay === i ? "day-tab selected" : "day-tab"} onClick={() => setSelectedDay(i)}><span>{d}</span><i className={(data.sessions[dateId]?.done && selectedDay === i) ? "day-check done" : "day-check"}>{data.sessions[dateId]?.done && selectedDay === i ? <Check size={11}/> : ""}</i></button>)}</div>
          <section className="workout-hero"><div className="hero-copy"><span className="pill"><span/> {activeDay.subtitle}</span><h2>{activeDay.title}</h2><p>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date)}</p><div className="hero-stats"><span><Dumbbell size={15}/>{activeDay.exercises.length} exercícios</span><span><Timer size={15}/>~55 min</span><span><Sparkles size={15}/>Foco em glúteos</span></div></div><div className="hero-decoration"><div className="orb orb-one"/><div className="orb orb-two"/><div className="hero-dumbbell"><Dumbbell size={70} strokeWidth={1.25}/></div><div className="hero-tag">TREINO {String.fromCharCode(65 + selectedDay)}</div></div></section>
          <div className="section-head"><div><h3>Seu treino de hoje</h3><p>Registre cada série e acompanhe sua evolução.</p></div><span className="counter">{completedSets}<i> / {allSets} séries</i></span></div>
          <div className="exercise-list">{activeDay.exercises.map((ex, i) => { const rows = entries[ex.name] ?? Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })); const exDone = rows.length >= ex.sets && rows.slice(0, ex.sets).every((r) => r.done); return <article className={exDone ? "exercise-card exercise-done" : "exercise-card"} key={`${selectedDay}-${ex.name}`}><div className="exercise-title"><span className={exDone ? "exercise-number finished" : "exercise-number"}>{exDone ? <Check size={14}/> : String(i + 1).padStart(2, "0")}</span><div className="exercise-name"><b>{ex.name}</b><small>{ex.sets} séries <span>·</span> {ex.reps} reps <span>·</span> descanso {ex.rest}</small></div><button className="icon-btn" aria-label="Editar exercício" onClick={() => { setEditing(i); setEditDraft({ ...ex }); }}><Pencil size={16}/></button></div><div className="set-head"><span>SÉRIE</span><span>CARGA (KG)</span><span>REPS</span><span>OK</span></div><div className="set-rows">{rows.slice(0, ex.sets).map((row, si) => <div className={row.done ? "set-row set-complete" : "set-row"} key={si}><span className="set-count">{si + 1}</span><input inputMode="decimal" aria-label={`Série ${si + 1}, carga em kg`} placeholder="—" value={row.weight} onChange={(e) => updateEntry(ex, si, "weight", e.target.value)}/><input inputMode="numeric" aria-label={`Série ${si + 1}, repetições`} placeholder={ex.reps.split("–")[0]} value={row.reps} onChange={(e) => updateEntry(ex, si, "reps", e.target.value)}/><button className={row.done ? "set-toggle checked" : "set-toggle"} aria-label={row.done ? "Desmarcar série" : "Marcar série concluída"} onClick={() => updateEntry(ex, si, "done", !row.done)}>{row.done && <Check size={15}/>}</button></div>)}</div></article>; })}</div>
          {activeDay.note && <div className="tip"><span><CircleHelp size={17}/></span><p><b>Dica de execução</b><br/>{activeDay.note}</p></div>}{activeDay.cardio && <div className="cardio"><span><HeartPulse size={17}/></span><p><b>Cardio do dia</b><br/>{activeDay.cardio}</p></div>}
          <button className={data.sessions[dateId]?.done ? "finish-btn finished-btn" : "finish-btn"} onClick={finishSession}>{data.sessions[dateId]?.done ? <><Check size={19}/>Treino concluído</> : <><Check size={19}/>Concluir treino <ArrowUpRight size={17}/></>}</button>
          <div className="training-note"><b><Sparkles size={15}/> Lembretes para hoje</b><span>Aqueça por 5–10 min · compostos: 90–120 s de descanso · mantenha 1–3 repetições em reserva.</span></div>
        </>}
        {section === "Evolução" && <ProgressView data={data} weekNum={weekNum} weeklyProgress={weeklyProgress} weekNote={weekNote} setWeekNote={setWeekNote} onSave={saveWeek}/>}
        {section === "Medidas" && <MeasuresView data={data} draft={measureDraft} setDraft={setMeasureDraft} onAdd={addMeasure}/>}
        {section === "Histórico" && <HistoryView data={data} date={date} setDate={setDate} moveWeek={moveWeek} />}
        <footer className="footer"><span>MYFIT <i>·</i> CICLO INICIAL DE 8 SEMANAS</span><span>Ficha orientativa · adapte com sua profissional de Educação Física</span></footer>
      </div>
    </main>
    <nav className="bottom-nav">{[["Treino", <Dumbbell size={19}/>], ["Evolução", <TrendingUp size={19}/>], ["Medidas", <Ruler size={19}/>], ["Histórico", <CalendarDays size={19}/>]].map(([label, icon]) => <button key={String(label)} className={section === label ? "bottom-item active" : "bottom-item"} onClick={() => setSection(String(label))}>{icon}<span>{label}</span></button>)}</nav>
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    {editing !== null && editDraft && <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="edit-modal" onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PERSONALIZAR</span><h3>Editar exercício</h3></div><button className="icon-btn" onClick={() => setEditing(null)}><X size={19}/></button></div><label>Nome do exercício<input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}/></label><div className="modal-grid"><label>Séries<input type="number" min="1" max="10" value={editDraft.sets} onChange={(e) => setEditDraft({ ...editDraft, sets: Math.max(1, Number(e.target.value)) })}/></label><label>Repetições<input value={editDraft.reps} onChange={(e) => setEditDraft({ ...editDraft, reps: e.target.value })}/></label></div><label>Descanso<input value={editDraft.rest} onChange={(e) => setEditDraft({ ...editDraft, rest: e.target.value })}/></label><button className="primary-btn" onClick={saveExercise}><Save size={17}/>Salvar exercício</button></div></div>}
  </div>;
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>{icon}<span>{label}</span>{active && <i/>}</button>; }

function ProgressView({ data, weekNum, weeklyProgress, weekNote, setWeekNote, onSave }: { data: AppData; weekNum: number; weeklyProgress: number; weekNote: { recovery: string; notes: string }; setWeekNote: (n: { recovery: string; notes: string }) => void; onSave: () => void }) {
  const exerciseName = "Elevação pélvica com barra";
  const points = Object.entries(data.logs).flatMap(([date, entries]) => (entries[exerciseName] ?? []).filter((e) => e.weight && e.done).map((e) => ({ date, value: Number(e.weight) }))).sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(50, ...points.map((x) => x.value)); const min = Math.min(...points.map((x) => x.value)); const range = max - min || 1;
  const poly = points.length ? points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 280},${95 - ((p.value - min) / range) * 68}`).join(" ") : "0,70 280,40";
  const current = data.weekly[String(weekNum)] ?? weekNote;
  useEffect(() => setWeekNote({ recovery: current.recovery, notes: current.notes }), [weekNum]);
  return <><div className="eyebrow">SEU PROGRESSO <span>·</span> CICLO DE 8 SEMANAS</div><div className="page-title"><div><h1>Seu progresso</h1><p className="muted">Pequenas conquistas, grandes mudanças.</p></div><span className="week-chip"><span className="week-icon"><Target size={17}/></span><span><b>Semana {weekNum}</b><small>em andamento</small></span></span></div><div className="stats-grid"><div className="stat-card"><span className="stat-symbol purple"><Dumbbell size={18}/></span><small>TREINOS CONCLUÍDOS</small><b>{Object.values(data.sessions).filter((s) => s.done).length}<i> / 40</i></b><div className="mini-track"><i style={{ width: `${Math.round(Object.values(data.sessions).filter((s) => s.done).length / 40 * 100)}%` }}/></div></div><div className="stat-card"><span className="stat-symbol pink"><Target size={18}/></span><small>FREQUÊNCIA DA SEMANA</small><b>{Math.round(weeklyProgress)}<i>%</i></b><div className="mini-track"><i style={{ width: `${weeklyProgress}%` }}/></div></div><div className="stat-card"><span className="stat-symbol lilac"><TrendingUp size={18}/></span><small>REGISTROS DE CARGA</small><b>{points.length}<i> sessões</i></b><span className="stat-caption">Acompanhe sua progressão</span></div></div><div className="chart-card"><div className="chart-heading"><div><span className="eyebrow">CARGA REGISTRADA</span><h3>Elevação pélvica</h3></div><span className="chart-badge">KG <ChevronDown size={14}/></span></div><div className="chart-area"><div className="chart-y"><span>{max} kg</span><span>{Math.round((max + min) / 2)} kg</span><span>{min} kg</span></div><svg viewBox="0 0 280 108" preserveAspectRatio="none" role="img" aria-label="Gráfico de carga da elevação pélvica"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8d62ed" stopOpacity=".22"/><stop offset="1" stopColor="#8d62ed" stopOpacity="0"/></linearGradient></defs><path d={`M ${poly.replaceAll(" ", " L ")} L 280 108 L 0 108 Z`} fill="url(#fill)"/><polyline points={poly} fill="none" stroke="#8054e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p, i) => <circle key={i} cx={(i / Math.max(1, points.length - 1)) * 280} cy={95 - ((p.value - min) / range) * 68} r="4" fill="white" stroke="#8054e8" strokeWidth="2"/> )}</svg></div><div className="chart-x"><span>{points[0]?.date.slice(5) ?? "Semana 1"}</span><span>{points.at(-1)?.date.slice(5) ?? `Semana ${weekNum}`}</span></div><div className="chart-foot"><span><i/>Evolução de carga</span><b>{points.at(-1)?.value ? `${points.at(-1)?.value} kg` : "Adicione registros no treino"}</b></div></div><div className="progress-callout"><span><Sparkles size={18}/></span><p><b>Progressão dupla</b><br/>Complete as repetições da faixa com boa execução; depois, aumente a carga gradualmente.</p></div><div className="weekly-card"><div className="section-head"><div><h3>Acompanhamento semanal</h3><p>Semana {weekNum} de 8 · anote como foi.</p></div><span className="week-badge">{weekNum} / 8</span></div><div className="week-row"><label>Como está sua recuperação?<select value={weekNote.recovery} onChange={(e) => setWeekNote({ ...weekNote, recovery: e.target.value })}><option value="">Selecione</option><option>Excelente</option><option>Boa</option><option>Regular</option><option>Preciso descansar mais</option></select></label><label>Observações<textarea placeholder="Energia, sono, cargas, como se sentiu…" value={weekNote.notes} onChange={(e) => setWeekNote({ ...weekNote, notes: e.target.value })}/></label></div><button className="primary-btn" onClick={onSave}><Save size={16}/>Salvar semana</button></div></>;
}

function MeasuresView({ data, draft, setDraft, onAdd }: { data: AppData; draft: { weight: string; waist: string; hip: string; thigh: string }; setDraft: (d: { weight: string; waist: string; hip: string; thigh: string }) => void; onAdd: () => void }) {
  const latest = data.measures.at(-1);
  return <><div className="eyebrow">ACOMPANHAMENTO PESSOAL <span>·</span> PRIVADO</div><div className="page-title"><div><h1>Suas medidas</h1><p className="muted">Registre com calma. Seu progresso é individual.</p></div><span className="private-pill"><span/>Só você vê</span></div><div className="measure-intro"><span><Ruler size={20}/></span><p>As medidas ajudam a enxergar sua evolução junto com força, energia e bem-estar. Registre quando quiser, de preferência em condições parecidas.</p></div><div className="measure-form"><div className="section-head"><div><h3>Novo registro</h3><p>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}</p></div><span className="week-badge">CM · KG</span></div><div className="measure-fields">{([["weight", "Peso", "kg"], ["waist", "Cintura", "cm"], ["hip", "Quadril", "cm"], ["thigh", "Coxa", "cm"]] as const).map(([key, label, unit]) => <label key={key}>{label}<div className="field-unit"><input inputMode="decimal" placeholder="0,0" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}/><span>{unit}</span></div></label>)}</div><button className="primary-btn" onClick={onAdd}><Plus size={17}/>Adicionar medidas</button></div><div className="measure-history"><div className="section-head"><div><h3>Histórico de medidas</h3><p>{data.measures.length} registros</p></div><span className="private-pill"><span/>Privado</span></div>{data.measures.length === 0 ? <div className="empty-state"><span><Ruler size={22}/></span><b>Seu primeiro registro começa aqui</b><p>Quando estiver pronta, adicione suas medidas acima.</p></div> : <><div className="measure-highlights">{[["Peso", latest?.weight, "kg"], ["Cintura", latest?.waist, "cm"], ["Quadril", latest?.hip, "cm"]].map(([k, v, u]) => <div className="measure-highlight" key={k}><small>{k}</small><b>{v || "—"}<i>{v ? ` ${u}` : ""}</i></b></div>)}</div><div className="history-table"><div className="table-row table-head"><span>DATA</span><span>PESO</span><span>CINTURA</span><span>QUADRIL</span><span>COXA</span></div>{[...data.measures].reverse().map((m, i) => <div className="table-row" key={i}><span>{new Date(`${m.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><span>{m.weight || "—"}</span><span>{m.waist || "—"}</span><span>{m.hip || "—"}</span><span>{m.thigh || "—"}</span></div>)}</div></>}</div></>;
}

function HistoryView({ data, date, setDate, moveWeek }: { data: AppData; date: Date; setDate: (d: Date) => void; moveWeek: (n: number) => void }) {
  const year = date.getFullYear(), month = date.getMonth(); const first = new Date(year, month, 1); const offset = (first.getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]; while (cells.length % 7) cells.push(null);
  const workoutDates = useMemo(() => new Set(Object.entries(data.sessions).filter(([, s]) => s.done).map(([k]) => k)), [data.sessions]);
  const changeMonth = (n: number) => setDate(new Date(year, month + n, 1));
  const selected = data.sessions[keyFor(date)];
  return <><div className="eyebrow">SUA JORNADA <span>·</span> TREINOS CONCLUÍDOS</div><div className="page-title"><div><h1>Histórico</h1><p className="muted">Cada treino conta. Olha só o caminho que você já fez.</p></div><span className="private-pill"><span/>Só você vê</span></div><div className="history-overview"><div><span className="stat-symbol purple"><CalendarDays size={18}/></span><small>TREINOS REGISTRADOS</small><b>{workoutDates.size}</b></div><div><span className="stat-symbol pink"><Activity size={18}/></span><small>SEMANAS DO CICLO</small><b>8<i> semanas</i></b></div></div><div className="calendar-card"><div className="calendar-heading"><div><small>CALENDÁRIO DE TREINOS</small><h3>{monthNames[month]} <span>{year}</span></h3></div><div className="calendar-arrows"><button onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={19}/></button><button onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={19}/></button></div></div><div className="calendar-grid calendar-days">{"SMTQQSS".split("").map((x, i) => <span key={i}>{["S", "T", "Q", "Q", "S", "S", "D"][i]}</span>)}</div><div className="calendar-grid">{cells.map((day, i) => { if (!day) return <span key={`e-${i}`}/>; const d = new Date(year, month, day); const k = keyFor(d); const trained = workoutDates.has(k); const isToday = k === todayKey(); const isSelected = k === keyFor(date); return <button key={k} className={`${trained ? "calendar-date trained" : "calendar-date"} ${isToday ? "today" : ""} ${isSelected ? "selected-date" : ""}`} onClick={() => setDate(d)}>{day}{trained && <i/>}</button>; })}</div><div className="calendar-legend"><span><i/>Treino concluído</span><span><i className="legend-today"/>Hoje</span></div></div><div className="selected-day-card"><div className="selected-date-icon"><CalendarDays size={18}/></div><div><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date)}</small><b>{selected?.done ? "Treino concluído" : date > new Date() ? "Dia planejado" : "Dia de descanso"}</b></div>{selected?.done && <span className="completed-tag"><Check size={14}/> Feito</span>}</div><div className="history-tip"><span><Sparkles size={17}/></span><p>Olhe para sua consistência, não para a perfeição. Descanso também faz parte do progresso.</p></div></>;
}

