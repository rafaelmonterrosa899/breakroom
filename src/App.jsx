import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { db, ref, set, onValue, remove, update, get } from './firebase'

// ─── Config ──────────────────────────────────────────────────────
const DEFAULT_BREAK_TYPES = {
  working_ticket: { label: 'Working Ticket', icon: '🎫', maxMinutes: 480, color: '#2563eb', requiresTicket: true },
  lunch: { label: 'Lunch', icon: '🍽️', maxMinutes: 60, color: '#e67e22' },
  break15: { label: '15 Min Break', icon: '☕', maxMinutes: 15, color: '#3498db' },
  break10: { label: '10 Min Break', icon: '⏸️', maxMinutes: 10, color: '#9b59b6' },
  personal: { label: 'Personal', icon: '🚶', maxMinutes: 30, color: '#1abc9c' },
}

const ICON_OPTIONS = ['🎫', '🍽️', '☕', '⏸️', '🚶', '📚', '🏋️', '🩺', '📞', '🧘', '💼', '🎯', '🔧', '🚗', '🛒', '💊', '🎓', '🧑‍💻', '🏠', '⚡', '🌙']
const COLOR_OPTIONS = ['#e67e22', '#3498db', '#9b59b6', '#1abc9c', '#e74c3c', '#2ecc71', '#f39c12', '#e84393', '#00cec9', '#6c5ce7', '#fd79a8', '#636e72']

const DEFAULT_USERS = {
  u1: { id: 'u1', username: 'george', name: 'George', role: 'admin', password: 'admin123', avatar: 'G' },
  u2: { id: 'u2', username: 'agent1', name: 'Agent One', role: 'agent', password: 'agent123', avatar: 'A1' },
  u3: { id: 'u3', username: 'agent2', name: 'Agent Two', role: 'agent', password: 'agent123', avatar: 'A2' },
  u4: { id: 'u4', username: 'agent3', name: 'Agent Three', role: 'agent', password: 'agent123', avatar: 'A3' },
  u5: { id: 'u5', username: 'agent4', name: 'Agent Four', role: 'agent', password: 'agent123', avatar: 'A4' },
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatDuration(ms) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function objToArr(obj) {
  if (!obj) return []
  return Object.values(obj)
}

// ─── Styles ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg-deep: #0a0e17; --bg-surface: #111827; --bg-card: #1a2332;
  --bg-card-hover: #1f2b3d; --bg-elevated: #243044;
  --border: #2a3a52; --border-light: #334766;
  --text-primary: #f0f4f8; --text-secondary: #8899aa; --text-muted: #5a6b7d;
  --accent: #f97316; --accent-glow: rgba(249,115,22,0.15);
  --success: #22c55e; --success-glow: rgba(34,197,94,0.15);
  --warning: #eab308; --warning-glow: rgba(234,179,8,0.15);
  --danger: #ef4444; --danger-glow: rgba(239,68,68,0.15);
  --info: #3b82f6; --info-glow: rgba(59,130,246,0.15);
  --radius: 12px; --radius-sm: 8px; --radius-lg: 16px;
  --shadow: 0 4px 24px rgba(0,0,0,0.3); --shadow-lg: 0 8px 40px rgba(0,0,0,0.4);
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'DM Sans', sans-serif; background: var(--bg-deep); color: var(--text-primary); min-height: 100vh; -webkit-font-smoothing: antialiased; }
.mono { font-family: 'JetBrains Mono', monospace; }
.login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 50%), var(--bg-deep); padding: 20px; }
.login-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 48px 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-lg); }
.login-card h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.5px; }
.login-card .subtitle { color: var(--text-secondary); margin-bottom: 32px; font-size: 14px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit; font-size: 15px; outline: none; transition: border-color var(--transition); }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border: none; border-radius: var(--radius-sm); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all var(--transition); }
.btn-primary { background: var(--accent); color: white; width: 100%; }
.btn-primary:hover { background: #ea6c0a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249,115,22,0.3); }
.btn-break { padding: 16px 20px; border-radius: var(--radius); background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-primary); font-size: 15px; width: 100%; text-align: left; }
.btn-break:hover { border-color: var(--border-light); background: var(--bg-card-hover); transform: translateY(-1px); }
.btn-break .break-icon { font-size: 22px; }
.btn-break .break-max { font-size: 12px; color: var(--text-muted); }
.btn-end { background: var(--danger); color: white; width: 100%; padding: 16px; font-size: 16px; border-radius: var(--radius); }
.btn-end:hover { background: #dc2626; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 8px 16px; font-size: 13px; }
.btn-ghost:hover { border-color: var(--border-light); color: var(--text-primary); }
.btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }
.error-msg { background: var(--danger-glow); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 16px; }
.app-layout { min-height: 100vh; display: flex; flex-direction: column; }
.topbar { background: var(--bg-surface); border-bottom: 1px solid var(--border); padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.topbar-left { display: flex; align-items: center; gap: 16px; }
.topbar-logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
.topbar-logo span { color: var(--accent); }
.topbar-tabs { display: flex; gap: 4px; }
.topbar-tab { padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; color: var(--text-secondary); background: transparent; border: none; cursor: pointer; transition: all var(--transition); font-family: inherit; }
.topbar-tab:hover { color: var(--text-primary); background: var(--bg-card); }
.topbar-tab.active { color: var(--accent); background: var(--accent-glow); }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; background: var(--accent); flex-shrink: 0; }
.avatar-sm { width: 32px; height: 32px; font-size: 11px; }
.user-info { text-align: right; }
.user-info .name { font-size: 14px; font-weight: 600; }
.user-info .role { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.main { flex: 1; padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%; }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.card-title { font-size: 16px; font-weight: 600; }
.card-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.timer-display { text-align: center; padding: 40px 20px; }
.timer-type { font-size: 16px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.timer-value { font-family: 'JetBrains Mono', monospace; font-size: 64px; font-weight: 600; letter-spacing: -2px; line-height: 1; margin-bottom: 8px; }
.timer-started { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; }
.timer-progress { width: 100%; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; margin-bottom: 24px; }
.timer-progress-bar { height: 100%; border-radius: 3px; transition: width 1s linear, background-color 500ms; }
.status-on-break { color: var(--warning); }
.status-overtime { color: var(--danger); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
.agent-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: all var(--transition); }
.agent-card:hover { border-color: var(--border-light); }
.agent-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.agent-card .agent-name { font-weight: 600; font-size: 15px; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-available { background: var(--success-glow); color: var(--success); }
.status-on-break-badge { background: var(--warning-glow); color: var(--warning); }
.status-working-badge { background: var(--info-glow); color: var(--info); }
.status-overtime-badge { background: var(--danger-glow); color: var(--danger); animation: pulse 1.5s ease-in-out infinite; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.agent-timer { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 600; margin: 8px 0; }
.agent-break-type { font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.agent-progress { width: 100%; height: 4px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; margin-top: 12px; }
.agent-progress-bar { height: 100%; border-radius: 2px; transition: width 1s linear, background-color 500ms; }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; text-align: center; }
.stat-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 600; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.history-table { width: 100%; border-collapse: collapse; }
.history-table th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); padding: 8px 12px; border-bottom: 1px solid var(--border); }
.history-table td { padding: 12px; font-size: 14px; border-bottom: 1px solid rgba(42,58,82,0.5); }
.history-table tr:hover td { background: var(--bg-card-hover); }
.break-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; background: var(--bg-elevated); }
.overtime-tag { color: var(--danger); font-weight: 600; }
.break-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
.empty-state .icon { font-size: 40px; margin-bottom: 12px; }
.empty-state .msg { font-size: 14px; }
.user-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid rgba(42,58,82,0.5); }
.user-row:last-child { border-bottom: none; }
.user-row-info { flex: 1; }
.user-row-info .name { font-weight: 600; font-size: 14px; }
.user-row-info .meta { font-size: 12px; color: var(--text-muted); }
.add-user-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.add-user-form input { padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 13px; outline: none; }
.add-user-form input:focus { border-color: var(--accent); }
.category-row { display: flex; align-items: center; gap: 12px; padding: 14px 12px; border-bottom: 1px solid rgba(42,58,82,0.5); transition: background var(--transition); }
.category-row:hover { background: var(--bg-card-hover); }
.category-row:last-child { border-bottom: none; }
.category-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.category-info { flex: 1; }
.category-info .name { font-weight: 600; font-size: 14px; }
.category-info .meta { font-size: 12px; color: var(--text-muted); }
.category-actions { display: flex; gap: 6px; }
.icon-picker, .color-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.icon-option { width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-surface); cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all var(--transition); }
.icon-option:hover { border-color: var(--border-light); background: var(--bg-elevated); }
.icon-option.selected { border-color: var(--accent); background: var(--accent-glow); }
.color-option { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all var(--transition); }
.color-option:hover { transform: scale(1.2); }
.color-option.selected { border-color: var(--text-primary); box-shadow: 0 0 0 2px var(--bg-card); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 32px; width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); animation: modalIn 200ms ease-out; }
@keyframes modalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal h2 { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.modal-actions { display: flex; gap: 8px; margin-top: 24px; justify-content: flex-end; }
.sync-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--success); margin-right: 6px; }
.loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; color: var(--text-muted); }
.loading-screen .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .topbar { padding: 0 16px; } .topbar-tabs { display: none; }
  .mobile-tabs { display: flex !important; overflow-x: auto; gap: 4px; padding: 8px 16px; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
  .main { padding: 16px; } .break-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: 1fr 1fr; } .timer-value { font-size: 48px; }
  .add-user-form { grid-template-columns: 1fr; } .dashboard-grid { grid-template-columns: 1fr; }
  .user-info { display: none; }
}
.mobile-tabs { display: none; }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: 6px; animation: livePulse 2s ease-in-out infinite; }
@keyframes livePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } }
.notification { position: fixed; top: 72px; right: 24px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 20px; box-shadow: var(--shadow-lg); font-size: 14px; z-index: 1000; animation: slideIn 300ms ease-out; max-width: 320px; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`

// ─── Firebase init helper ────────────────────────────────────────
async function initFirebaseData() {
  const snap = await get(ref(db, 'users'))
  if (!snap.exists()) {
    await set(ref(db, 'users'), DEFAULT_USERS)
    await set(ref(db, 'breakTypes'), DEFAULT_BREAK_TYPES)
    await set(ref(db, 'breaks'), {})
    await set(ref(db, 'history'), {})
    await set(ref(db, 'currentTickets'), {})
  }
}

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState({})
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('br_session')) } catch { return null }
  })
  const [breakTypes, setBreakTypes] = useState({})
  const [breaks, setBreaks] = useState({})
  const [history, setHistory] = useState({})
  const [currentTickets, setCurrentTickets] = useState({})
  const [tab, setTab] = useState('my-break')
  const [now, setNow] = useState(Date.now())
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)

  // Init Firebase data & subscribe
  useEffect(() => {
    initFirebaseData().then(() => {
      onValue(ref(db, 'users'), s => { if (s.exists()) setUsers(s.val()) })
      onValue(ref(db, 'breakTypes'), s => { if (s.exists()) setBreakTypes(s.val()); else setBreakTypes(DEFAULT_BREAK_TYPES) })
      onValue(ref(db, 'breaks'), s => { setBreaks(s.exists() ? s.val() : {}) })
      onValue(ref(db, 'history'), s => { setHistory(s.exists() ? s.val() : {}) })
      onValue(ref(db, 'currentTickets'), s => { setCurrentTickets(s.exists() ? s.val() : {}) })
      setLoading(false)
    })
  }, [])

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => { if (currentUser) localStorage.setItem('br_session', JSON.stringify(currentUser)); else localStorage.removeItem('br_session') }, [currentUser])

  const notify = useCallback((msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000) }, [])

  // Auth
  const handleLogin = useCallback((username, password) => {
    const user = Object.values(users).find(u => u.username === username && u.password === password)
    if (user) { setCurrentUser(user); return true }
    return false
  }, [users])
  const handleLogout = useCallback(() => { setCurrentUser(null); setTab('my-break') }, [])

  // Active break
  const myActiveBreak = useMemo(() => {
    if (!currentUser) return null
    return Object.values(breaks).find(b => b.userId === currentUser.id && !b.endTime) || null
  }, [breaks, currentUser])

  // Break actions
  const startBreak = useCallback((type, ticketNumber) => {
    if (!currentUser || myActiveBreak) return
    const bt = breakTypes[type]
    if (!bt) return
    const id = `${currentUser.id}_${Date.now()}`
    const ticket = ticketNumber || null
    set(ref(db, `breaks/${id}`), { id, userId: currentUser.id, userName: currentUser.name, type, startTime: Date.now(), endTime: null, ticketNumber: ticket })
    if (ticket) set(ref(db, `currentTickets/${currentUser.id}`), ticket)
    notify(`${bt.icon} ${bt.label} started${ticket ? ` — #${ticket}` : ''}`)
  }, [currentUser, myActiveBreak, breakTypes, notify])

  const endBreak = useCallback(() => {
    if (!currentUser || !myActiveBreak) return
    const endTime = Date.now()
    const duration = endTime - myActiveBreak.startTime
    // Move to history
    const hId = `h_${Date.now()}`
    set(ref(db, `history/${hId}`), { ...myActiveBreak, endTime, duration })
    // Remove active break
    remove(ref(db, `breaks/${myActiveBreak.id}`))
    const bt = breakTypes[myActiveBreak.type]
    if (bt && bt.requiresTicket) {
      remove(ref(db, `currentTickets/${currentUser.id}`))
    }
    notify(`✅ ${bt?.requiresTicket ? 'Ticket done' : 'Break ended'} — ${formatDuration(duration)}`)
  }, [currentUser, myActiveBreak, breakTypes, notify])

  const forceEndBreak = useCallback((breakId) => {
    const b = breaks[breakId]
    if (!b) return
    const endTime = Date.now()
    const hId = `h_${Date.now()}`
    set(ref(db, `history/${hId}`), { ...b, endTime, duration: endTime - b.startTime, forcedBy: currentUser?.name })
    remove(ref(db, `breaks/${breakId}`))
    notify(`⚠️ Ended ${b.userName}'s break`)
  }, [breaks, currentUser, notify])

  const setUserTicket = useCallback((ticket) => {
    if (!currentUser) return
    if (ticket) set(ref(db, `currentTickets/${currentUser.id}`), ticket)
    else remove(ref(db, `currentTickets/${currentUser.id}`))
  }, [currentUser])

  // User management
  const addUser = useCallback((name, username, password) => {
    const id = `u_${Date.now()}`
    const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    set(ref(db, `users/${id}`), { id, username, name, role: 'agent', password, avatar })
    notify(`👤 ${name} added`)
  }, [notify])

  const removeUser = useCallback((userId) => {
    remove(ref(db, `users/${userId}`))
    Object.entries(breaks).forEach(([k, v]) => { if (v.userId === userId) remove(ref(db, `breaks/${k}`)) })
  }, [breaks])

  // Break type management
  const addBreakType = useCallback((key, data) => { set(ref(db, `breakTypes/${key}`), data); notify(`${data.icon} "${data.label}" added`) }, [notify])
  const updateBreakType = useCallback((key, data) => { set(ref(db, `breakTypes/${key}`), data); notify(`✏️ "${data.label}" updated`) }, [notify])
  const removeBreakType = useCallback((key) => {
    const bt = breakTypes[key]
    const activeOfType = Object.values(breaks).find(b => b.type === key && !b.endTime)
    if (activeOfType) { notify(`❌ Can't delete — someone is on ${bt?.label}`); return }
    remove(ref(db, `breakTypes/${key}`))
    notify(`🗑️ "${bt?.label}" deleted`)
  }, [breakTypes, breaks, notify])

  if (loading) return (<><style>{CSS}</style><div className="loading-screen"><div className="spinner" /><div>Connecting to BreakRoom...</div></div></>)
  if (!currentUser) return (<><style>{CSS}</style><LoginScreen users={users} onLogin={handleLogin} /></>)

  const isAdmin = currentUser.role === 'admin'
  const usersArr = objToArr(users)
  const historyArr = objToArr(history).sort((a, b) => b.startTime - a.startTime)
  const tabs = [
    { id: 'my-break', label: 'My Break' },
    { id: 'dashboard', label: 'Live Dashboard' },
    { id: 'history', label: 'History' },
    ...(isAdmin ? [{ id: 'categories', label: 'Break Types' }, { id: 'manage', label: 'Users' }] : []),
  ]

  return (
    <><style>{CSS}</style>
      <div className="app-layout">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-logo">☕ <span>Break</span>Room</div>
            <div className="topbar-tabs">
              {tabs.map(t => (
                <button key={t.id} className={`topbar-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.id === 'dashboard' && <span className="live-dot" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center' }}><span className="sync-dot" />Live</div>
            <div className="user-info"><div className="name">{currentUser.name}</div><div className="role">{currentUser.role}</div></div>
            <div className="avatar">{currentUser.avatar}</div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <div className="mobile-tabs">{tabs.map(t => (<button key={t.id} className={`topbar-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>))}</div>
        <main className="main">
          {tab === 'my-break' && <MyBreakTab breakTypes={breakTypes} activeBreak={myActiveBreak} now={now} onStartBreak={startBreak} onEndBreak={endBreak} currentTicket={currentTickets[currentUser.id] || null} onSetTicket={setUserTicket} todayHistory={historyArr.filter(h => h.userId === currentUser.id && new Date(h.startTime).toISOString().split('T')[0] === getToday())} />}
          {tab === 'dashboard' && <DashboardTab breakTypes={breakTypes} users={usersArr} breaks={breaks} currentTickets={currentTickets} now={now} isAdmin={isAdmin} onForceEnd={forceEndBreak} />}
          {tab === 'history' && <HistoryTab breakTypes={breakTypes} history={historyArr} isAdmin={isAdmin} currentUserId={currentUser.id} />}
          {tab === 'categories' && isAdmin && <ManageBreakTypesTab breakTypes={breakTypes} onAdd={addBreakType} onUpdate={updateBreakType} onRemove={removeBreakType} />}
          {tab === 'manage' && isAdmin && <ManageUsersTab users={usersArr} onAddUser={addUser} onRemoveUser={removeUser} currentUserId={currentUser.id} />}
        </main>
        {notification && <div className="notification">{notification}</div>}
      </div>
    </>
  )
}

// ─── Login ───────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); if (!onLogin(username, password)) setError('Invalid credentials.') }
  return (
    <div className="login-wrapper"><div className="login-card">
      <h1>☕ BreakRoom</h1><p className="subtitle">Team Break & Lunch Tracker · <span style={{ color: 'var(--success)', fontSize: 12 }}>● Real-time</span></p>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Username</label><input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }} placeholder="Enter username" autoFocus /></div>
        <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Enter password" /></div>
        <button type="submit" className="btn btn-primary">Sign In</button>
      </form>
      <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Demo Credentials</strong><br />Admin: george / admin123<br />Agent: agent1 / agent123
      </div>
    </div></div>
  )
}

// ─── My Break ────────────────────────────────────────────────────
function MyBreakTab({ breakTypes, activeBreak, now, onStartBreak, onEndBreak, currentTicket, onSetTicket, todayHistory }) {
  const [pendingType, setPendingType] = useState(null)
  const [ticketNumber, setTicketNumber] = useState('')
  const [returnPrompt, setReturnPrompt] = useState(null)
  const [newTicketInput, setNewTicketInput] = useState('')

  const handleEndBreak = () => {
    const bt = breakTypes[activeBreak?.type]
    const isTicketWork = bt && bt.requiresTicket
    if (!isTicketWork && currentTicket) { onEndBreak(); setReturnPrompt({ previousTicket: currentTicket }) }
    else { onEndBreak() }
  }

  const handleReturnSameTicket = () => {
    const ticketKey = Object.keys(breakTypes).find(k => breakTypes[k].requiresTicket)
    if (ticketKey) onStartBreak(ticketKey, returnPrompt.previousTicket)
    setReturnPrompt(null)
  }
  const handleReturnNewTicket = () => {
    if (!newTicketInput.trim()) return
    onSetTicket(newTicketInput.trim())
    const ticketKey = Object.keys(breakTypes).find(k => breakTypes[k].requiresTicket)
    if (ticketKey) onStartBreak(ticketKey, newTicketInput.trim())
    setReturnPrompt(null); setNewTicketInput('')
  }
  const handleReturnNoTicket = () => { onSetTicket(null); setReturnPrompt(null) }

  if (returnPrompt) {
    return (
      <div className="card"><div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Welcome back!</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          You were working on ticket <span style={{ color: 'var(--info)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>#{returnPrompt.previousTicket}</span> before your break.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
          <button className="btn btn-primary" style={{ padding: '14px 24px', fontSize: 15 }} onClick={handleReturnSameTicket}>🎫 Continue with #{returnPrompt.previousTicket}</button>
          <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'left' }}>Switch to a different ticket:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={newTicketInput} onChange={e => setNewTicketInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleReturnNewTicket() }} placeholder="New ticket number..." style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, outline: 'none' }} />
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={handleReturnNewTicket}>Start</button>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '12px 24px' }} onClick={handleReturnNoTicket}>No ticket for now</button>
        </div>
      </div></div>
    )
  }

  if (activeBreak) {
    const elapsed = now - activeBreak.startTime
    const breakInfo = breakTypes[activeBreak.type] || { label: 'Unknown', icon: '❓', maxMinutes: 30, color: '#888' }
    const maxMs = breakInfo.maxMinutes * 60 * 1000; const pct = Math.min((elapsed / maxMs) * 100, 100); const overtime = elapsed > maxMs; const isTicket = breakInfo.requiresTicket
    return (
      <div className="card"><div className="timer-display">
        <div className="timer-type"><span>{breakInfo.icon}</span><span>{breakInfo.label}</span></div>
        {activeBreak.ticketNumber && <div style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'var(--info-glow)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, color: 'var(--info)' }}>🎫 Ticket #{activeBreak.ticketNumber}</div>}
        {!isTicket && currentTicket && <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>Last ticket: #{currentTicket}</div>}
        <div className={`timer-value mono ${isTicket ? '' : overtime ? 'status-overtime' : 'status-on-break'}`} style={isTicket ? { color: 'var(--info)' } : {}}>{formatDuration(elapsed)}</div>
        <div className="timer-started">Started at {formatTime(activeBreak.startTime)}{!isTicket && ` · Max ${breakInfo.maxMinutes} min`}{!isTicket && overtime && <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · ⚠️ OVERTIME</span>}</div>
        {!isTicket && <div className="timer-progress"><div className="timer-progress-bar" style={{ width: `${pct}%`, backgroundColor: overtime ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : breakInfo.color }} /></div>}
        <button className="btn btn-end" onClick={handleEndBreak}>{isTicket ? '✅ Done with Ticket' : '⏹ End Break'}</button>
      </div></div>
    )
  }

  const handleBreakClick = (key) => { const bt = breakTypes[key]; if (bt.requiresTicket) { setPendingType(key); setTicketNumber(currentTicket || '') } else { onStartBreak(key) } }
  const handleTicketSubmit = () => { if (!ticketNumber.trim()) return; onStartBreak(pendingType, ticketNumber.trim()); setPendingType(null); setTicketNumber('') }
  const handleTicketCancel = () => { setPendingType(null); setTicketNumber('') }

  return (
    <>
      {currentTicket && !activeBreak && (
        <div style={{ marginBottom: 16, padding: '12px 20px', background: 'var(--info-glow)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: 'var(--info)' }}><span style={{ fontWeight: 600 }}>🎫 Current ticket:</span> <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>#{currentTicket}</span></div>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => onSetTicket(null)}>Clear</button>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div><div className="card-title">Start a Break</div><div className="card-subtitle">Select your break type below</div></div><span className="status-badge status-available"><span className="status-dot" /> Available</span></div>
        <div className="break-grid">
          {Object.entries(breakTypes).map(([key, bt]) => (
            <button key={key} className="btn btn-break" onClick={() => handleBreakClick(key)} style={pendingType === key ? { borderColor: 'var(--info)', background: 'var(--info-glow)' } : {}}>
              <span className="break-icon">{bt.icon}</span>{' '}<strong>{bt.label}</strong>
              <span className="break-max">{bt.requiresTicket ? ' · Enter ticket #' : ` · Max ${bt.maxMinutes}min`}</span>
            </button>
          ))}
        </div>
        {pendingType && (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--info)', animation: 'modalIn 200ms ease-out' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>🎫 Enter Ticket Number</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleTicketSubmit(); if (e.key === 'Escape') handleTicketCancel() }} placeholder="e.g. 123456, ZD-7890..." autoFocus style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, outline: 'none' }} />
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleTicketSubmit}>Start</button>
              <button className="btn btn-ghost" style={{ padding: '10px 14px' }} onClick={handleTicketCancel}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      {todayHistory.length > 0 && (
        <div className="card"><div className="card-header"><div className="card-title">Today's Breaks</div></div>
          <table className="history-table"><thead><tr><th>Type</th><th>Ticket</th><th>Start</th><th>End</th><th>Duration</th></tr></thead>
            <tbody>{todayHistory.map((h, i) => { const info = breakTypes[h.type] || { label: h.type, icon: '❓', maxMinutes: 30 }; const isOT = !info.requiresTicket && h.duration > info.maxMinutes * 60 * 1000
              return (<tr key={i}><td><span className="break-tag">{info.icon} {info.label}</span></td><td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: h.ticketNumber ? 'var(--info)' : 'var(--text-muted)' }}>{h.ticketNumber ? `#${h.ticketNumber}` : '—'}</td><td>{formatTime(h.startTime)}</td><td>{formatTime(h.endTime)}</td><td className={isOT ? 'overtime-tag' : ''}>{formatDuration(h.duration)} {isOT && '⚠️'}</td></tr>)
            })}</tbody></table></div>
      )}
    </>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────
function DashboardTab({ breakTypes, users, breaks, currentTickets, now, isAdmin, onForceEnd }) {
  const activeBreaks = Object.values(breaks).filter(b => !b.endTime)
  const workingCount = activeBreaks.filter(b => { const bt = breakTypes[b.type]; return bt && bt.requiresTicket }).length
  const onBreakCount = activeBreaks.length - workingCount
  const overtimeCount = activeBreaks.filter(b => { const bt = breakTypes[b.type] || { maxMinutes: 30 }; return !bt.requiresTicket && (now - b.startTime) > bt.maxMinutes * 60 * 1000 }).length

  return (
    <>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--text-primary)' }}>{users.length}</div><div className="stat-label">Total</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{users.length - onBreakCount - workingCount}</div><div className="stat-label">Available</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--info)' }}>{workingCount}</div><div className="stat-label">Working</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{onBreakCount}</div><div className="stat-label">On Break</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{overtimeCount}</div><div className="stat-label">Overtime</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title"><span className="live-dot" />Live Agent Status</div></div>
        <div className="dashboard-grid">
          {users.map(user => {
            const ab = activeBreaks.find(b => b.userId === user.id)
            const userTicket = currentTickets[user.id] || null
            if (ab) {
              const elapsed = now - ab.startTime
              const info = breakTypes[ab.type] || { label: ab.type, icon: '❓', maxMinutes: 30, color: '#888' }
              const maxMs = info.maxMinutes * 60 * 1000; const pct = Math.min((elapsed / maxMs) * 100, 100)
              const ot = !info.requiresTicket && elapsed > maxMs; const isTicket = info.requiresTicket
              return (
                <div key={user.id} className="agent-card" style={{ borderColor: ot ? 'rgba(239,68,68,0.4)' : isTicket ? 'rgba(59,130,246,0.3)' : 'rgba(234,179,8,0.3)' }}>
                  <div className="agent-card-header">
                    <div className="avatar avatar-sm" style={{ background: info.color }}>{user.avatar}</div>
                    <div><div className="agent-name">{user.name}</div><span className={`status-badge ${ot ? 'status-overtime-badge' : isTicket ? 'status-working-badge' : 'status-on-break-badge'}`}><span className="status-dot" />{ot ? 'Overtime' : isTicket ? 'Working' : 'On Break'}</span></div>
                  </div>
                  <div className="agent-break-type">{info.icon} {info.label}{!isTicket && ` · Max ${info.maxMinutes}m`}</div>
                  {ab.ticketNumber && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>🎫 Ticket #{ab.ticketNumber}</div>}
                  {!isTicket && userTicket && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Last ticket: #{userTicket}</div>}
                  <div className={`agent-timer ${isTicket ? '' : ot ? 'status-overtime' : 'status-on-break'}`} style={isTicket ? { color: 'var(--info)' } : {}}>{formatDuration(elapsed)}</div>
                  {!isTicket && <div className="agent-progress"><div className="agent-progress-bar" style={{ width: `${pct}%`, backgroundColor: ot ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : info.color }} /></div>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Started {formatTime(ab.startTime)}</div>
                  {isAdmin && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => onForceEnd(ab.id)}>⏹ End</button>}
                </div>
              )
            }
            return (
              <div key={user.id} className="agent-card">
                <div className="agent-card-header"><div className="avatar avatar-sm">{user.avatar}</div>
                  <div><div className="agent-name">{user.name}</div><span className="status-badge status-available"><span className="status-dot" /> Available</span></div>
                </div>
                {userTicket && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Last ticket: #{userTicket}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── History ─────────────────────────────────────────────────────
function HistoryTab({ breakTypes, history, isAdmin, currentUserId }) {
  const [filter, setFilter] = useState('all')
  const items = isAdmin ? history : history.filter(h => h.userId === currentUserId)
  const filtered = filter === 'all' ? items : items.filter(h => h.type === filter)
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Break History</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={filter === 'all' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter('all')}>All</button>
          {Object.entries(breakTypes).map(([key, bt]) => (<button key={key} className="btn btn-ghost btn-sm" style={filter === key ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter(key)}>{bt.icon}</button>))}
        </div></div>
      {filtered.length === 0 ? <div className="empty-state"><div className="icon">📋</div><div className="msg">No break history yet</div></div> : (
        <table className="history-table"><thead><tr>{isAdmin && <th>Agent</th>}<th>Type</th><th>Ticket</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Status</th></tr></thead>
          <tbody>{filtered.slice(0, 50).map((h, i) => { const info = breakTypes[h.type] || { label: h.type, icon: '❓', maxMinutes: 30 }; const isOT = !info.requiresTicket && h.duration > info.maxMinutes * 60 * 1000
            return (<tr key={i}>{isAdmin && <td style={{ fontWeight: 500 }}>{h.userName}</td>}<td><span className="break-tag">{info.icon} {info.label}</span></td><td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: h.ticketNumber ? 'var(--info)' : 'var(--text-muted)' }}>{h.ticketNumber ? `#${h.ticketNumber}` : '—'}</td><td style={{ color: 'var(--text-secondary)' }}>{new Date(h.startTime).toLocaleDateString()}</td><td className="mono" style={{ fontSize: 13 }}>{formatTime(h.startTime)}</td><td className="mono" style={{ fontSize: 13 }}>{formatTime(h.endTime)}</td><td className={`mono ${isOT ? 'overtime-tag' : ''}`} style={{ fontSize: 13 }}>{formatDuration(h.duration)}</td><td>{isOT ? <span className="status-badge status-overtime-badge">Overtime</span> : <span className="status-badge status-available">OK</span>}</td></tr>)
          })}</tbody></table>
      )}
    </div>
  )
}

// ─── Manage Break Types ──────────────────────────────────────────
function ManageBreakTypesTab({ breakTypes, onAdd, onUpdate, onRemove }) {
  const [showModal, setShowModal] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [form, setForm] = useState({ label: '', icon: '☕', maxMinutes: 15, color: '#3498db', requiresTicket: false })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const openAdd = () => { setEditingKey(null); setForm({ label: '', icon: '☕', maxMinutes: 15, color: '#3498db', requiresTicket: false }); setShowModal(true) }
  const openEdit = (key) => { const bt = breakTypes[key]; setEditingKey(key); setForm({ label: bt.label, icon: bt.icon, maxMinutes: bt.maxMinutes, color: bt.color, requiresTicket: bt.requiresTicket || false }); setShowModal(true) }
  const handleSave = () => { if (!form.label.trim()) return; if (editingKey) onUpdate(editingKey, { ...form, label: form.label.trim() }); else { const key = form.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now(); onAdd(key, { ...form, label: form.label.trim() }) }; setShowModal(false) }
  const handleDelete = (key) => { if (confirmDelete === key) { onRemove(key); setConfirmDelete(null) } else { setConfirmDelete(key); setTimeout(() => setConfirmDelete(null), 3000) } }
  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">Break Categories</div><div className="card-subtitle">{Object.keys(breakTypes).length} categories</div></div>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={openAdd}>+ New Category</button></div>
        {Object.entries(breakTypes).map(([key, bt]) => (
          <div key={key} className="category-row">
            <div className="category-icon" style={{ background: bt.color + '22' }}>{bt.icon}</div>
            <div className="category-info"><div className="name">{bt.label}{bt.requiresTicket && <span style={{ fontSize: 11, color: 'var(--info)', marginLeft: 8, fontWeight: 400 }}>🎫 requires ticket</span>}</div><div className="meta">Max {bt.maxMinutes} min</div></div>
            <div className="category-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(key)}>✏️ Edit</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: confirmDelete === key ? 'var(--danger)' : undefined }} onClick={() => handleDelete(key)}>{confirmDelete === key ? '⚠️ Confirm?' : '🗑️ Delete'}</button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <h2>{editingKey ? 'Edit Category' : 'New Break Category'}</h2>
          <div className="form-group"><label>Name</label><input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Training, Coaching..." autoFocus /></div>
          <div className="form-group"><label>Max Duration (minutes)</label><input type="number" min="1" max="480" value={form.maxMinutes} onChange={e => setForm(f => ({ ...f, maxMinutes: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, requiresTicket: !f.requiresTicket }))}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: form.requiresTicket ? 'var(--info)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', transition: 'all 200ms' }}>{form.requiresTicket && '✓'}</div>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>Requires ticket number</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Agent must enter a ticket # when starting</div></div>
          </div>
          <div className="form-group"><label>Icon</label><div className="icon-picker">{ICON_OPTIONS.map(icon => (<button key={icon} className={`icon-option ${form.icon === icon ? 'selected' : ''}`} onClick={() => setForm(f => ({ ...f, icon }))}>{icon}</button>))}</div></div>
          <div className="form-group"><label>Color</label><div className="color-picker">{COLOR_OPTIONS.map(color => (<button key={color} className={`color-option ${form.color === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => setForm(f => ({ ...f, color }))} />))}</div></div>
          <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Preview</div>
            <button className="btn btn-break" style={{ cursor: 'default' }}><span className="break-icon">{form.icon}</span>{' '}<strong>{form.label || 'Category Name'}</strong><span className="break-max"> · Max {form.maxMinutes}min</span></button>
          </div>
          <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleSave}>{editingKey ? 'Save Changes' : 'Create Category'}</button></div>
        </div></div>
      )}
    </>
  )
}

// ─── Manage Users ────────────────────────────────────────────────
function ManageUsersTab({ users, onAddUser, onRemoveUser, currentUserId }) {
  const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState('')
  const handleAdd = () => { if (!name.trim() || !username.trim() || !password.trim()) return; onAddUser(name.trim(), username.trim(), password.trim()); setName(''); setUsername(''); setPassword('') }
  return (
    <div className="card">
      <div className="card-header"><div><div className="card-title">Manage Users</div><div className="card-subtitle">{users.length} registered</div></div></div>
      {users.map(u => (
        <div key={u.id} className="user-row"><div className="avatar avatar-sm">{u.avatar}</div>
          <div className="user-row-info"><div className="name">{u.name}</div><div className="meta">@{u.username} · {u.role} {u.id === currentUserId && '(you)'}</div></div>
          {u.id !== currentUserId && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onRemoveUser(u.id)}>Remove</button>}
        </div>
      ))}
      <div className="add-user-form">
        <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={handleAdd}>+ Add</button>
      </div>
    </div>
  )
}
