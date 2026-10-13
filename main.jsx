import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  LayoutDashboard, CalendarDays, BookOpen, ClipboardList, ChartNoAxesCombined,
  Settings, Search, Plus, ChevronLeft, ChevronRight, Clock3, CheckCircle2,
  CircleDashed, Circle, AlertCircle, Sparkles, ArrowRight, Wallet, ShieldCheck,
  Wrench, Brain, Laptop, Menu, X, Download, Upload, RotateCcw, Pencil, Trash2,
  CalendarCheck, ListTodo, Lightbulb, SlidersHorizontal, Check, CalendarClock,
  Target, BookMarked, CircleHelp
} from 'lucide-react'
import { curriculum } from './curriculum'
import './styles.css'

const STORAGE_KEY = 'lifeskills-calendar-v1'
const STATUS = {
  not_started: { label: 'No iniciado', color: 'slate', icon: Circle },
  practice: { label: 'Necesita práctica', color: 'amber', icon: CircleDashed },
  mastered: { label: 'Dominado', color: 'green', icon: CheckCircle2 },
  help: { label: 'Necesita ayuda', color: 'red', icon: AlertCircle },
}
const AREA_ICONS = { 'Dinero y leyes': Wallet, 'Seguridad y salud': ShieldCheck, 'Oficios y autonomía': Wrench, 'Mente y comunicación': Brain, 'Tiempo y tecnología': Laptop }
const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'curriculum', label: 'Plan de estudios', icon: BookOpen },
  { id: 'activities', label: 'Actividades', icon: ClipboardList },
  { id: 'progress', label: 'Progreso', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Configuración', icon: Settings },
]
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const dateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const plusDays = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return dateISO(d) }
const prettyDate = (s, opts={ weekday:'short', day:'numeric', month:'short' }) => new Intl.DateTimeFormat('es-CL', opts).format(new Date(`${s}T12:00:00`))
const blankData = () => ({ settings: { learner: 'Mi estudiante', year: new Date().getFullYear(), sessionsPerWeek: 4 }, unitStatus: {}, notes: {}, activities: [], evaluations: [] })
function loadData() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...blankData(), ...JSON.parse(raw) } : blankData() }
  catch { return blankData() }
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}` }
function App() {
  const [data, setData] = useState(loadData)
  const [page, setPage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [selectedSubject, setSelectedSubject] = useState(curriculum[0].id)
  const [selectedUnit, setSelectedUnit] = useState(curriculum[0].units[0].id)
  const [month, setMonth] = useState(new Date())
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [toast, setToast] = useState('')
  const [recommendationMode, setRecommendationMode] = useState('next')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [detailSubject, setDetailSubject] = useState(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) } }, [toast])

  const allUnits = useMemo(() => curriculum.flatMap(s => s.units.map((u, index) => ({...u, subjectId:s.id, subject:s.name, area:s.area, color:s.color, subjectIndex:index, subjectUnitCount:s.units.length}))), [])
  const getStatus = (unitId) => data.unitStatus[unitId] || 'not_started'
  const updateStatus = (unitId, status) => setData(d => ({...d, unitStatus:{...d.unitStatus, [unitId]:status}}))
  const getSubject = (id) => curriculum.find(s => s.id === id) || curriculum[0]
  const getUnit = (id) => allUnits.find(u => u.id === id) || allUnits[0]

  const recommendation = useMemo(() => {
    const needsHelp = allUnits.find(u => getStatus(u.id) === 'help')
    if (recommendationMode === 'review') {
      const practice = allUnits.find(u => ['practice','help'].includes(getStatus(u.id)))
      return practice || allUnits.find(u => getStatus(u.id) === 'not_started') || allUnits[0]
    }
    // Keep each subject's sequence: do not suggest later units until previous units are mastered.
    for (const subject of curriculum) {
      const firstNotMastered = subject.units.find(u => getStatus(u.id) !== 'mastered')
      if (!firstNotMastered) continue
      const status = getStatus(firstNotMastered.id)
      if (status === 'help' || status === 'practice') return {...firstNotMastered, subjectId:subject.id, subject:subject.name, area:subject.area, color:subject.color, reason: status === 'help' ? 'Esta unidad necesita apoyo; conviene retomarla con una actividad más guiada.' : 'Ya se trabajó esta habilidad; una práctica diferente puede consolidarla.'}
      return {...firstNotMastered, subjectId:subject.id, subject:subject.name, area:subject.area, color:subject.color, reason:'Es la siguiente unidad pendiente de esta asignatura. Puedes empezarla cuando tengas tiempo.'}
    }
    return allUnits[0]
  }, [data.unitStatus, recommendationMode, allUnits])

  const counts = useMemo(() => {
    const out = { total: allUnits.length, mastered:0, practice:0, help:0, not_started:0 }
    allUnits.forEach(u => out[getStatus(u.id)]++)
    return out
  }, [data.unitStatus, allUnits])
  const progress = Math.round(counts.mastered / counts.total * 100)
  const upcoming = [...data.activities].filter(a => a.status !== 'done').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4)
  const subjectProgress = (s) => {
    const done = s.units.filter(u=>getStatus(u.id)==='mastered').length
    return {done, total:s.units.length, percent:Math.round(done/s.units.length*100)}
  }
  const showPage = (id) => { setPage(id); setMobileOpen(false); setDetailSubject(null) }
  const openRecommendation = () => { setSelectedSubject(recommendation.subjectId || curriculum[0].id); setSelectedUnit(recommendation.id); setDetailSubject(getSubject(recommendation.subjectId || curriculum[0].id)); setPage('curriculum') }
  const addActivity = (prefill={}) => { setEditingActivity({ id:'', title:prefill.title||'', date:prefill.date||todayISO(), subjectId:prefill.subjectId||selectedSubject, unitId:prefill.unitId||selectedUnit, duration:prefill.duration||25, status:'planned', priority:'normal', notes:'' }); setShowActivityModal(true) }
  const saveActivity = (a) => {
    setData(d => ({...d, activities: a.id ? d.activities.map(x=>x.id===a.id?a:x) : [...d.activities, {...a,id:uid()}]}))
    setShowActivityModal(false); setEditingActivity(null); setToast('Actividad guardada')
  }
  const patchActivity = (id, patch) => setData(d=>({...d, activities:d.activities.map(a=>a.id===id?{...a,...patch}:a)}))
  const deleteActivity = (id) => { if(confirm('¿Eliminar esta actividad?')) setData(d=>({...d, activities:d.activities.filter(a=>a.id!==id)})) }
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='lifeskills-respaldo.json'; a.click(); URL.revokeObjectURL(url)
  }
  const importBackup = () => {
    try { const parsed=JSON.parse(importText); if(!parsed || typeof parsed!=='object') throw new Error(); setData({...blankData(),...parsed}); setShowImport(false); setImportText(''); setToast('Respaldo importado') }
    catch { setToast('No se pudo leer el respaldo JSON') }
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>
      <div className="brand">
        <div className="brand-mark"><Sparkles size={21}/></div>
        <div><div className="brand-name">LifeSkills<span>.</span></div><div className="brand-sub">CALENDAR & LEARNING</div></div>
        <button className="icon-button mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={19}/></button>
      </div>
      <div className="profile-card">
        <div className="avatar">LS</div>
        <div className="profile-text"><strong>Panel del adulto</strong><span>Planificación privada</span></div>
        <span className="online-dot"/>
      </div>
      <div className="nav-caption">ESPACIO DE TRABAJO</div>
      <nav className="main-nav">
        {NAV.map(n=>{const Icon=n.icon; return <button key={n.id} className={`nav-item ${page===n.id?'active':''}`} onClick={()=>showPage(n.id)}><Icon size={18}/><span>{n.label}</span>{n.id==='activities'&&data.activities.some(a=>a.status!=='done')&&<span className="nav-count">{data.activities.filter(a=>a.status!=='done').length}</span>}</button>})}
      </nav>
      <div className="sidebar-bottom">
        <div className="tip-card"><div className="tip-icon"><Lightbulb size={17}/></div><strong>Aprender haciendo</strong><p>Las actividades son sugerencias. Tú decides el ritmo y cuándo avanzar.</p></div>
        <div className="sidebar-foot"><span className="secure-dot"/> Datos guardados en este navegador</div>
      </div>
    </aside>
    {mobileOpen && <div className="scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="breadcrumbs">LifeSkills <span>/</span> <strong>{NAV.find(n=>n.id===page)?.label || 'Plan de estudios'}</strong></div></div>
        <div className="top-actions"><div className="today-pill"><CalendarDays size={15}/>{prettyDate(todayISO(),{day:'numeric',month:'short',year:'numeric'})}</div><button className="primary-button small" onClick={()=>addActivity()}><Plus size={16}/> Nueva actividad</button></div>
      </header>
      <div className="page-content">
        {page==='dashboard' && <Dashboard data={data} counts={counts} progress={progress} recommendation={recommendation} recommendationMode={recommendationMode} setRecommendationMode={setRecommendationMode} onOpenRecommendation={openRecommendation} onAddActivity={addActivity} upcoming={upcoming} patchActivity={patchActivity} showPage={showPage} subjectProgress={subjectProgress} />}
        {page==='calendar' && <CalendarPage month={month} setMonth={setMonth} activities={data.activities} addActivity={addActivity} editActivity={(a)=>{setEditingActivity(a);setShowActivityModal(true)}} patchActivity={patchActivity} />}
        {page==='curriculum' && <CurriculumPage query={query} setQuery={setQuery} areaFilter={areaFilter} setAreaFilter={setAreaFilter} detailSubject={detailSubject} setDetailSubject={setDetailSubject} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} selectedUnit={selectedUnit} setSelectedUnit={setSelectedUnit} getStatus={getStatus} updateStatus={updateStatus} data={data} setData={setData} addActivity={addActivity} subjectProgress={subjectProgress} />}
        {page==='activities' && <ActivitiesPage activities={data.activities} editActivity={(a)=>{setEditingActivity(a);setShowActivityModal(true)}} patchActivity={patchActivity} deleteActivity={deleteActivity} addActivity={addActivity} />}
        {page==='progress' && <ProgressPage counts={counts} progress={progress} getStatus={getStatus} subjectProgress={subjectProgress} />}
        {page==='settings' && <SettingsPage data={data} setData={setData} exportBackup={exportBackup} showImport={()=>setShowImport(true)} />}
      </div>
      <footer className="app-footer"><span>LifeSkills Calendar</span><span>Una guía flexible para aprender habilidades reales.</span></footer>
    </main>
    {showActivityModal && <ActivityModal activity={editingActivity} onClose={()=>{setShowActivityModal(false);setEditingActivity(null)}} onSave={saveActivity} />}
    {showImport && <Modal title="Importar respaldo" onClose={()=>setShowImport(false)}><p className="muted">Pega el contenido de un archivo JSON exportado desde LifeSkills.</p><textarea className="input textarea" rows="7" value={importText} onChange={e=>setImportText(e.target.value)} placeholder='{"settings":...}'/><div className="modal-actions"><button className="secondary-button" onClick={()=>setShowImport(false)}>Cancelar</button><button className="primary-button" onClick={importBackup}><Upload size={16}/> Importar datos</button></div></Modal>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function PageHeading({eyebrow,title,subtitle,action}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function ProgressRing({percent=0,color='#3977F6',size=76}) {
  const r=29, c=2*Math.PI*r, dash=c*percent/100
  return <svg width={size} height={size} viewBox="0 0 76 76" className="progress-ring"><circle cx="38" cy="38" r={r} stroke="#E8EDF4" strokeWidth="7" fill="none"/><circle cx="38" cy="38" r={r} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`} transform="rotate(-90 38 38)"/><text x="38" y="42" textAnchor="middle" fontSize="14" fontWeight="750" fill="#1D2939">{percent}%</text></svg>
}
function Dashboard({data,counts,progress,recommendation,recommendationMode,setRecommendationMode,onOpenRecommendation,onAddActivity,upcoming,patchActivity,showPage,subjectProgress}) {
  return <>
    <PageHeading eyebrow="TU CENTRO DE APRENDIZAJE" title={`Hola, ${data.settings.learner || 'bienvenido'} 👋`} subtitle="Organiza las próximas experiencias. Avanza al ritmo de tu familia, sin fechas rígidas." action={<button className="secondary-button" onClick={()=>showPage('curriculum')}><BookOpen size={16}/> Ver plan de estudios</button>}/>
    <div className="hero-banner"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-content"><div className="hero-label"><Sparkles size={14}/> TU SIGUIENTE PASO</div><h2>{recommendation?.title || 'Comienza con una unidad'}</h2><p>{recommendation?.subject || 'Plan de estudios'} · {recommendation?.area || 'Habilidades para la vida'}</p><div className="hero-reason">{recommendation?.reason || 'El sistema te sugerirá una unidad según el progreso registrado.'}</div><div className="hero-buttons"><button className="white-button" onClick={onOpenRecommendation}>Ver lección sugerida <ArrowRight size={16}/></button><button className="hero-ghost" onClick={()=>onAddActivity({title:recommendation?.title,subjectId:recommendation?.subjectId,unitId:recommendation?.id})}><Plus size={16}/> Planificar actividad</button></div></div><div className="hero-illustration"><div className="illustration-card card-back"><BookOpen size={28}/><span>Explorar</span></div><div className="illustration-card card-front"><Sparkles size={31}/><strong>Aprender</strong><span>haciendo</span></div><div className="illustration-spark spark-a">✦</div><div className="illustration-spark spark-b">✧</div></div></div>
    <div className="stats-grid">
      <StatCard label="Progreso del plan" value={`${progress}%`} detail={`${counts.mastered} de ${counts.total} unidades dominadas`} icon={ChartNoAxesCombined} color="blue" visual={<div className="mini-progress"><span style={{width:`${progress}%`}}/></div>}/>
      <StatCard label="Unidades dominadas" value={counts.mastered} detail="Habilidades que ya demuestra" icon={CheckCircle2} color="green" visual={<span className="stat-note green-note">● Dominadas</span>}/>
      <StatCard label="Por practicar" value={counts.practice} detail="Conviene repetir con otra actividad" icon={CircleDashed} color="amber" visual={<span className="stat-note amber-note">● En desarrollo</span>}/>
      <StatCard label="Necesita apoyo" value={counts.help} detail="Revisar con calma y acompañamiento" icon={AlertCircle} color="red" visual={<span className="stat-note red-note">● Requiere atención</span>}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel recommendation-panel"><div className="panel-header"><div><h3>Tu recomendación</h3><p>El sistema propone; tú decides.</p></div><span className="icon-soft purple"><Sparkles size={18}/></span></div><div className="recommend-switch"><button className={recommendationMode==='next'?'selected':''} onClick={()=>setRecommendationMode('next')}>Siguiente unidad</button><button className={recommendationMode==='review'?'selected':''} onClick={()=>setRecommendationMode('review')}>Repasar</button></div><div className="recommend-body"><div className="recommend-icon" style={{background:`${recommendation?.color||'#3977F6'}18`,color:recommendation?.color||'#3977F6'}}><Lightbulb size={24}/></div><div className="recommend-text"><span className="small-label">{recommendation?.subject}</span><h4>{recommendation?.title}</h4><p>{recommendation?.objective}</p></div></div><div className="suggested-activity"><div className="suggested-top"><span><Clock3 size={14}/> {recommendation?.duration || 25} min sugeridos</span><span><Target size={14}/> Práctica real</span></div><strong>Idea de actividad</strong><p>{recommendation?.activity}</p><div className="materials"><span>Preparar:</span> {recommendation?.materials}</div></div><div className="recommend-footer"><button className="text-button" onClick={onOpenRecommendation}>Abrir unidad <ArrowRight size={15}/></button><button className="primary-button small" onClick={()=>onAddActivity({title:recommendation?.title,subjectId:recommendation?.subjectId,unitId:recommendation?.id,duration:recommendation?.duration})}><Plus size={15}/> Programar</button></div></section>
      <section className="panel"><div className="panel-header"><div><h3>Próximas actividades</h3><p>Sin presión: cambia fechas cuando lo necesites.</p></div><button className="icon-button" onClick={()=>showPage('calendar')} aria-label="Abrir calendario"><ArrowRight size={18}/></button></div>{upcoming.length===0?<EmptyState icon={CalendarClock} title="Tu agenda está abierta" text="Cuando quieras, programa una actividad y aparecerá aquí." action={<button className="primary-button small" onClick={()=>onAddActivity()}><Plus size={15}/> Crear actividad</button>}/>:<div className="upcoming-list">{upcoming.map(a=><ActivityRow key={a.id} activity={a} onDone={()=>patchActivity(a.id,{status:'done'})}/>)}</div>}<button className="full-link" onClick={()=>showPage('activities')}>Ver todas las actividades <ArrowRight size={15}/></button></section>
    </div>
    <section className="panel areas-panel"><div className="panel-header"><div><h3>Áreas de aprendizaje</h3><p>25 asignaturas para desarrollar habilidades útiles en la vida diaria.</p></div><button className="text-button" onClick={()=>showPage('curriculum')}>Ver asignaturas <ArrowRight size={15}/></button></div><div className="area-cards">{Object.entries(Object.groupBy ? Object.groupBy(curriculum,s=>s.area) : curriculum.reduce((o,s)=>((o[s.area]??=[]).push(s),o),{})).map(([area,subs])=>{const color=subs[0].color;const done=subs.reduce((n,s)=>n+subjectProgress(s).done,0);const total=subs.length*4;const Icon=AREA_ICONS[area]||BookOpen;return <button className="area-card" key={area} onClick={()=>showPage('curriculum')}><div className="area-card-top"><span className="area-icon" style={{background:`${color}18`,color}}><Icon size={20}/></span><span className="area-percent">{Math.round(done/total*100)}%</span></div><strong>{area}</strong><span className="area-meta">{subs.length} asignaturas · {done}/{total} unidades</span><div className="area-bar"><span style={{width:`${done/total*100}%`,background:color}}/></div></button>})}</div></section>
  </>
}
function StatCard({label,value,detail,icon:Icon,color,visual}) {return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div><div className="stat-visual">{visual}</div></div>}
function ActivityRow({activity,onDone,onEdit}) {const sub=curriculum.find(s=>s.id===activity.subjectId);return <div className="activity-row"><div className="activity-date"><strong>{prettyDate(activity.date,{day:'2-digit'})}</strong><span>{prettyDate(activity.date,{month:'short'})}</span></div><div className="activity-color" style={{background:sub?.color||'#3977F6'}}/><div className="activity-info"><strong>{activity.title||'Actividad sin título'}</strong><span>{sub?.name||'Asignatura'} · {activity.duration||25} min</span></div>{activity.status==='done'?<span className="status-pill green">Realizada</span>:<button className="done-button" onClick={onDone} title="Marcar como realizada"><Check size={15}/></button>}</div>}
function EmptyState({icon:Icon,title,text,action}) {return <div className="empty-state"><span className="empty-icon"><Icon size={25}/></span><strong>{title}</strong><p>{text}</p>{action}</div>}

function CalendarPage({month,setMonth,activities,addActivity,editActivity,patchActivity}) {
  const y=month.getFullYear(), m=month.getMonth(), first=new Date(y,m,1), start=(first.getDay()+6)%7, days=new Date(y,m+1,0).getDate()
  const cells=[...Array(start).fill(null),...Array.from({length:days},(_,i)=>i+1)]
  const [selectedDate,setSelectedDate]=useState(todayISO())
  const dayActivities=activities.filter(a=>a.date===selectedDate)
  const monthName=new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric'}).format(month)
  return <><PageHeading eyebrow="ORGANIZA A TU RITMO" title="Calendario" subtitle="Planifica cuando puedas. Las actividades pendientes no se pierden ni se consideran un fracaso." action={<button className="primary-button" onClick={()=>addActivity({date:selectedDate})}><Plus size={16}/> Nueva actividad</button>}/>
    <div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-toolbar"><button className="icon-button" onClick={()=>setMonth(new Date(y,m-1,1))}><ChevronLeft size={18}/></button><h3 className="month-title">{monthName}</h3><button className="icon-button" onClick={()=>setMonth(new Date(y,m+1,1))}><ChevronRight size={18}/></button><button className="secondary-button compact" onClick={()=>{setMonth(new Date());setSelectedDate(todayISO())}}>Hoy</button></div><div className="calendar-grid weekday-grid">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div key={d}>{d}</div>)}</div><div className="calendar-grid days-grid">{cells.map((day,i)=>{if(!day)return <div key={`e${i}`} className="calendar-day empty"/>;const ds=dateISO(new Date(y,m,day,12));const items=activities.filter(a=>a.date===ds);return <button key={ds} className={`calendar-day ${selectedDate===ds?'selected':''} ${ds===todayISO()?'today':''}`} onClick={()=>setSelectedDate(ds)}><span className="day-number">{day}</span><div className="day-dots">{items.slice(0,3).map(a=><i key={a.id} style={{background:curriculum.find(s=>s.id===a.subjectId)?.color||'#3977F6'}}/>)}{items.length>3&&<small>+{items.length-3}</small>}</div>{items.slice(0,2).map(a=><span className="day-event" key={a.id} style={{borderLeftColor:curriculum.find(s=>s.id===a.subjectId)?.color||'#3977F6'}}>{a.title}</span>)}</button>})}</div><div className="calendar-legend">{curriculum.filter((s,i,a)=>a.findIndex(x=>x.area===s.area)===i).map(s=><span key={s.area}><i style={{background:s.color}}/>{s.area}</span>)}</div></section><aside className="panel day-panel"><div className="panel-header"><div><span className="eyebrow">DÍA SELECCIONADO</span><h3>{prettyDate(selectedDate,{weekday:'long',day:'numeric',month:'long'})}</h3></div><span className="icon-soft blue"><CalendarDays size={19}/></span></div><button className="primary-button full-button" onClick={()=>addActivity({date:selectedDate})}><Plus size={16}/> Planificar para este día</button>{dayActivities.length===0?<EmptyState icon={CalendarClock} title="Día libre" text="No hay actividades programadas. Puedes dejarlo así o añadir una cuando te venga bien."/>:<div className="day-activity-list">{dayActivities.map(a=>{const s=curriculum.find(x=>x.id===a.subjectId);return <div className="day-activity" key={a.id}><div className="day-activity-head"><span className="area-dot" style={{background:s?.color}}/><strong>{a.title}</strong></div><span className="muted small-text">{s?.name} · {a.duration} min</span>{a.notes&&<p>{a.notes}</p>}<div className="day-activity-actions"><button className="text-button" onClick={()=>editActivity(a)}><Pencil size={14}/> Editar</button>{a.status!=='done'&&<button className="text-button green-text" onClick={()=>patchActivity(a.id,{status:'done'})}><Check size={14}/> Realizada</button>}</div></div>})}</div>}<p className="calendar-note"><Lightbulb size={15}/> Si cambias de planes, edita la fecha. La actividad sigue guardada.</p></aside></div>
  </>
}

function CurriculumPage({query,setQuery,areaFilter,setAreaFilter,detailSubject,setDetailSubject,selectedSubject,setSelectedSubject,selectedUnit,setSelectedUnit,getStatus,updateStatus,data,setData,addActivity,subjectProgress}) {
  const filtered=curriculum.filter(s=>(areaFilter==='Todas'||s.area===areaFilter)&&`${s.name} ${s.area} ${s.units.map(u=>u.title).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const subject=detailSubject || curriculum.find(s=>s.id===selectedSubject)
  const chosenUnit=subject?.units.find(u=>u.id===selectedUnit) || subject?.units[0]
  const setUnitNote=(id,value)=>setData(d=>({...d,notes:{...d.notes,[id]:value}}))
  return <><PageHeading eyebrow="EL MAPA COMPLETO" title="Plan de estudios" subtitle="25 asignaturas · 100 unidades · actividades prácticas para aprender haciendo." action={<div className="curriculum-count"><BookMarked size={16}/> 5 áreas</div>}/>
    {detailSubject ? <div className="subject-detail-view"><button className="back-link" onClick={()=>{setDetailSubject(null);setSelectedSubject(detailSubject.id)}}><ChevronLeft size={16}/> Todas las asignaturas</button><div className="subject-hero" style={{'--subject-color':detailSubject.color}}><div className="subject-hero-icon"><BookOpen size={26}/></div><div className="subject-hero-info"><span>{detailSubject.area}</span><h2>{detailSubject.name}</h2><p>4 unidades · Progreso basado en habilidades demostradas, no en fechas.</p></div><ProgressRing percent={subjectProgress(detailSubject).percent} color={detailSubject.color}/></div><div className="unit-layout"><section className="panel unit-list-panel"><div className="panel-header"><div><h3>Unidades de la asignatura</h3><p>Sigue el orden sugerido, pero tú decides cuándo avanzar.</p></div></div>{detailSubject.units.map((u,i)=>{const st=getStatus(u.id);const Icon=STATUS[st].icon;return <button key={u.id} className={`unit-list-item ${selectedUnit===u.id?'selected':''}`} onClick={()=>setSelectedUnit(u.id)}><span className="unit-number">{String(i+1).padStart(2,'0')}</span><span className="unit-list-copy"><strong>{u.title}</strong><small>{u.objective}</small></span><span className={`status-dot ${STATUS[st].color}`}><Icon size={16}/></span></button>})}</section><section className="panel unit-detail-panel">{chosenUnit&&<><div className="unit-detail-top"><span className="eyebrow">UNIDAD {detailSubject.units.findIndex(u=>u.id===chosenUnit.id)+1} DE 4</span><span className="duration-tag"><Clock3 size={14}/> {chosenUnit.duration} min sugeridos</span></div><h2>{chosenUnit.title}</h2><p className="unit-objective">{chosenUnit.objective}</p><div className="detail-section"><h4><Sparkles size={16}/> Idea práctica para aprender</h4><p>{chosenUnit.activity}</p></div><div className="detail-section"><h4><ClipboardList size={16}/> Materiales</h4><p>{chosenUnit.materials}</p></div><div className="detail-section"><h4><Target size={16}/> ¿Qué observar?</h4><p>{chosenUnit.evidence}</p></div><div className="detail-section"><h4><Pencil size={16}/> Observaciones del adulto</h4><textarea className="input textarea" rows="3" placeholder="¿Qué hizo bien? ¿Qué le costó? ¿Qué conviene repetir?" value={data.notes[chosenUnit.id]||''} onChange={e=>setUnitNote(chosenUnit.id,e.target.value)}/></div><div className="status-editor"><label>Estado de aprendizaje</label><div className="status-options">{Object.entries(STATUS).map(([key,s])=>{const Icon=s.icon;return <button key={key} className={`status-option ${s.color} ${getStatus(chosenUnit.id)===key?'chosen':''}`} onClick={()=>updateStatus(chosenUnit.id,key)}><Icon size={17}/>{s.label}{getStatus(chosenUnit.id)===key&&<Check size={14}/>}</button>})}</div></div><div className="unit-actions"><button className="secondary-button" onClick={()=>{const idx=detailSubject.units.findIndex(u=>u.id===chosenUnit.id);if(idx>0)setSelectedUnit(detailSubject.units[idx-1].id)}} disabled={detailSubject.units[0].id===chosenUnit.id}><ChevronLeft size={15}/> Anterior</button><button className="primary-button" onClick={()=>addActivity({title:chosenUnit.title,subjectId:detailSubject.id,unitId:chosenUnit.id,duration:chosenUnit.duration})}><Plus size={15}/> Planificar actividad</button><button className="secondary-button" onClick={()=>{const idx=detailSubject.units.findIndex(u=>u.id===chosenUnit.id);if(idx<3)setSelectedUnit(detailSubject.units[idx+1].id)}} disabled={detailSubject.units[3].id===chosenUnit.id}>Siguiente <ChevronRight size={15}/></button></div></>}</section></div></div> : <><div className="curriculum-tools"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar asignatura, unidad o tema..."/></div><div className="filter-box"><SlidersHorizontal size={16}/><select value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option>Todas</option>{curriculum.filter((s,i,a)=>a.findIndex(x=>x.area===s.area)===i).map(s=><option key={s.area}>{s.area}</option>)}</select></div></div><div className="curriculum-summary"><span><strong>25</strong> asignaturas</span><span><strong>100</strong> unidades</span><span><strong>{Object.values(data.unitStatus).filter(s=>s==='mastered').length}</strong> dominadas</span></div><div className="subjects-grid">{filtered.map(s=>{const Icon=AREA_ICONS[s.area]||BookOpen;const p=subjectProgress(s);return <button key={s.id} className="subject-card" onClick={()=>{setDetailSubject(s);setSelectedSubject(s.id);setSelectedUnit(s.units.find(u=>getStatus(u.id)!=='mastered')?.id||s.units[0].id)}}><div className="subject-card-top"><span className="subject-icon" style={{background:`${s.color}18`,color:s.color}}><Icon size={20}/></span><span className="subject-index">{s.id}</span></div><span className="subject-area" style={{color:s.color}}>{s.area}</span><h3>{s.name}</h3><div className="subject-units-preview">{s.units.map((u,i)=><span key={u.id} className={getStatus(u.id)==='mastered'?'unit-chip-done':''}>{i+1}. {u.title}</span>)}</div><div className="subject-card-footer"><div className="subject-progress-line"><span style={{width:`${p.percent}%`,background:s.color}}/></div><span>{p.done}/4</span></div></button>})}</div>{filtered.length===0&&<EmptyState icon={Search} title="No encontramos asignaturas" text="Prueba con otro término de búsqueda."/>}</>}
  </>
}

function ActivitiesPage({activities,editActivity,patchActivity,deleteActivity,addActivity}) {
  const [filter,setFilter]=useState('all')
  const filtered=activities.filter(a=>filter==='all'||(filter==='pending'&&a.status!=='done')||(filter==='done'&&a.status==='done')).sort((a,b)=>a.date.localeCompare(b.date))
  return <><PageHeading eyebrow="TU LISTA DE ACCIONES" title="Actividades" subtitle="Las actividades son flexibles. Puedes moverlas, repetirlas o dejarlas pendientes." action={<button className="primary-button" onClick={()=>addActivity()}><Plus size={16}/> Nueva actividad</button>}/><div className="tabs-row">{[['all','Todas'],['pending','Pendientes'],['done','Realizadas']].map(([k,v])=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{v} {k==='all'?activities.length:k==='pending'?activities.filter(a=>a.status!=='done').length:activities.filter(a=>a.status==='done').length}</button>)}</div>{filtered.length===0?<section className="panel"><EmptyState icon={ListTodo} title={filter==='done'?'Aún no hay actividades realizadas':'No hay actividades en esta lista'} text="Crea una actividad o cambia el filtro. El plan de estudios siempre estará disponible." action={<button className="primary-button" onClick={()=>addActivity()}><Plus size={16}/> Crear actividad</button>}/></section>:<section className="panel activity-table-panel"><div className="activity-table-head"><span>ACTIVIDAD</span><span>FECHA</span><span>ESTADO</span><span>ACCIONES</span></div>{filtered.map(a=>{const s=curriculum.find(x=>x.id===a.subjectId);const u=s?.units.find(x=>x.id===a.unitId);return <div className="activity-table-row" key={a.id}><div className="table-activity"><span className="area-dot" style={{background:s?.color}}/><div><strong>{a.title}</strong><small>{s?.name||'Sin asignatura'}{u?` · ${u.title}`:''}</small></div></div><span className="table-date">{prettyDate(a.date,{day:'numeric',month:'short',year:'numeric'})}</span><span><span className={`status-pill ${a.status==='done'?'green':'blue'}`}>{a.status==='done'?'Realizada':'Planificada'}</span></span><div className="table-actions"><button className="icon-button" onClick={()=>editActivity(a)} title="Editar"><Pencil size={16}/></button>{a.status!=='done'&&<button className="icon-button green-hover" onClick={()=>patchActivity(a.id,{status:'done'})} title="Marcar realizada"><Check size={16}/></button>}<button className="icon-button red-hover" onClick={()=>deleteActivity(a.id)} title="Eliminar"><Trash2 size={16}/></button></div></div>})}</section>}</>
}
function ProgressPage({counts,progress,getStatus,subjectProgress}) {
  return <><PageHeading eyebrow="APRENDIZAJE OBSERVADO" title="Progreso" subtitle="Mide habilidades demostradas, no asistencia ni sesiones cumplidas."/><div className="progress-overview"><section className="panel progress-main"><div><span className="eyebrow">PROGRESO GLOBAL</span><h2>{progress}%</h2><p>Unidades registradas como dominadas</p><div className="large-progress"><span style={{width:`${progress}%`}}/></div></div><ProgressRing percent={progress} size={96}/></section><div className="status-summary">{Object.entries(STATUS).map(([key,s])=>{const Icon=s.icon;return <div className="status-summary-card" key={key}><span className={`status-icon-large ${s.color}`}><Icon size={19}/></span><strong>{counts[key]}</strong><span>{s.label}</span></div>})}</div></div><section className="panel"><div className="panel-header"><div><h3>Progreso por asignatura</h3><p>Abre una asignatura en el plan de estudios para actualizar sus unidades.</p></div></div><div className="progress-subject-list">{curriculum.map(s=>{const p=subjectProgress(s);return <div className="progress-subject-row" key={s.id}><span className="area-dot" style={{background:s.color}}/><div className="progress-subject-name"><strong>{s.name}</strong><small>{s.area}</small></div><div className="progress-subject-bar"><span style={{width:`${p.percent}%`,background:s.color}}/></div><span className="progress-subject-count">{p.done}/{p.total}</span></div>})}</div></section><div className="notice-card"><CircleHelp size={19}/><div><strong>¿Cuándo marcar una unidad como dominada?</strong><p>Cuando observes que puede aplicar la habilidad de forma apropiada para su edad. Si solo lo recuerda con ayuda o necesita más práctica, mantén el estado correspondiente.</p></div></div></>
}
function SettingsPage({data,setData,exportBackup,showImport}) {
  const update=(key,value)=>setData(d=>({...d,settings:{...d.settings,[key]:value}}))
  const reset=()=>{if(confirm('¿Seguro que quieres borrar el progreso, las observaciones y las actividades de este navegador? Exporta un respaldo antes si lo necesitas.')){setData(blankData())}}
  return <><PageHeading eyebrow="PERSONALIZA TU ESPACIO" title="Configuración" subtitle="Adapta el panel a tu familia. Tú mantienes el control de todas las decisiones."/><div className="settings-grid"><section className="panel settings-panel"><div className="panel-header"><div><h3>Preferencias de aprendizaje</h3><p>Estos ajustes orientan las sugerencias, no son obligaciones.</p></div><span className="icon-soft blue"><Settings size={19}/></span></div><label className="field-label">Nombre o apodo del estudiante</label><input className="input" value={data.settings.learner} onChange={e=>update('learner',e.target.value)} placeholder="Mi estudiante"/><label className="field-label">Año de planificación</label><input className="input" type="number" value={data.settings.year} onChange={e=>update('year',Number(e.target.value))}/><label className="field-label">Sesiones que te gustaría planificar por semana</label><div className="choice-row">{[1,2,3,4,5].map(n=><button key={n} className={`choice-pill ${data.settings.sessionsPerWeek===n?'selected':''}`} onClick={()=>update('sessionsPerWeek',n)}>{n}</button>)}</div><p className="field-hint">Es una referencia opcional. Puedes hacer más, menos o ninguna sesión en una semana.</p></section><section className="panel settings-panel"><div className="panel-header"><div><h3>Respaldo de información</h3><p>Los datos se guardan en este navegador.</p></div><span className="icon-soft green"><Download size={19}/></span></div><div className="backup-info"><strong>Haz una copia de seguridad</strong><p>Exporta actividades, estados, observaciones y preferencias en un archivo JSON para conservarlos o importarlos después.</p></div><button className="secondary-button full-button" onClick={exportBackup}><Download size={16}/> Exportar respaldo JSON</button><button className="secondary-button full-button" onClick={showImport}><Upload size={16}/> Importar respaldo JSON</button><div className="warning-box"><AlertCircle size={17}/><span>Los datos no se sincronizan automáticamente entre tu celular y otros dispositivos. Guarda respaldos periódicos.</span></div></section><section className="panel settings-panel danger-panel"><div className="panel-header"><div><h3>Zona de reinicio</h3><p>Esta acción elimina los datos guardados localmente.</p></div><span className="icon-soft red"><RotateCcw size={19}/></span></div><button className="danger-button" onClick={reset}><Trash2 size={16}/> Borrar datos locales</button></section></div></>
}
function ActivityModal({activity,onClose,onSave}) {
  const [form,setForm]=useState(activity||{title:'',date:todayISO(),subjectId:curriculum[0].id,unitId:curriculum[0].units[0].id,duration:25,status:'planned',priority:'normal',notes:''})
  const subject=curriculum.find(s=>s.id===form.subjectId)||curriculum[0]
  const change=(key,value)=>setForm(f=>({...f,[key]:value,...(key==='subjectId'?{unitId:curriculum.find(s=>s.id===value)?.units[0].id||''}:{})}))
  return <Modal title={form.id?'Editar actividad':'Nueva actividad'} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave({...form,title:form.title.trim()||'Actividad práctica'})}}><label className="field-label">Nombre de la actividad</label><input className="input" value={form.title} onChange={e=>change('title',e.target.value)} placeholder="Ej. Comparar precios en una tienda" autoFocus/><div className="form-two"><div><label className="field-label">Fecha</label><input className="input" type="date" value={form.date} onChange={e=>change('date',e.target.value)} required/></div><div><label className="field-label">Duración estimada</label><select className="input" value={form.duration} onChange={e=>change('duration',Number(e.target.value))}>{[10,15,20,25,30,40,45,60].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></div></div><label className="field-label">Asignatura</label><select className="input" value={form.subjectId} onChange={e=>change('subjectId',e.target.value)}>{curriculum.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><label className="field-label">Unidad relacionada</label><select className="input" value={form.unitId} onChange={e=>change('unitId',e.target.value)}>{subject.units.map(u=><option key={u.id} value={u.id}>{u.title}</option>)}</select><label className="field-label">Notas y materiales</label><textarea className="input textarea" rows="3" value={form.notes||''} onChange={e=>change('notes',e.target.value)} placeholder="Materiales, ajustes, observaciones previas..."/><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Check size={16}/> Guardar actividad</button></div></form></Modal>
}
function Modal({title,onClose,children}) {return <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-header"><h3>{title}</h3><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18}/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
