import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ─── Config ──────────────────────────────────────────────────────
const BREAK_TYPES = {
  lunch: { label: 'Lunch', icon: '🍽️', maxMinutes: 60, color: '#e67e22' },
  break15: { label: '15 Min Break', icon: '☕', maxMinutes: 15, color: '#3498db' },
  break10: { label: '10 Min Break', icon: '⏸️', maxMinutes: 10, color: '#9b59b6' },
  personal: { label: 'Personal', icon: '🚶', maxMinutes: 30, color: '#1abc9c' },
}

const DEFAULT_USERS = [
  { id: '1', username: 'george', name: 'George', role: 'admin', password: 'admin123', avatar: 'G' },
  { id: '2', username: 'agent1', name: 'Agent One', role: 'agent', password: 'agent123', avatar: 'A1' },
  { id: '3', username: 'agent2', name: 'Agent Two', role: 'agent', password: 'agent123', avatar: 'A2' },
  { id: '4', username: 'agent3', name: 'Agent Three', role: 'agent', password: 'agent123', avatar: 'A3' },
  { id: '5', username: 'agent4', name: 'Agent Four', role: 'agent', password: 'agent123', avatar: 'A4' },
]

// ─── Helpers ─────────────────────────────────────────────────────
const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
    catch { return fallback }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
}

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

// ─── Styles ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg-deep: #0a0e17;
  --bg-surface: #111827;
  --bg-card: #1a2332;
  --bg-card-hover: #1f2b3d;
  --bg-elevated: #243044;
  --border: #2a3a52;
  --border-light: #334766;
  --text-primary: #f0f4f8;
  --text-secondary: #8899aa;
  --text-muted: #5a6b7d;
  --accent: #f97316;
  --accent-glow: rgba(249,115,22,0.15);
  --success: #22c55e;
  --success-glow: rgba(34,197,94,0.15);
  --warning: #eab308;
  --warning-glow: rgba(234,179,8,0.15);
  --danger: #ef4444;
  --danger-glow: rgba(239,68,68,0.15);
  --info: #3b82f6;
  --info-glow: rgba(59,130,246,0.15);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --shadow: 0 4px 24px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.4);
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.mono { font-family: 'JetBrains Mono', monospace; }

/* Login */
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 50%),
    var(--bg-deep);
  padding: 20px;
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
}

.login-card h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

.login-card .subtitle {
  color: var(--text-secondary);
  margin-bottom: 32px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 15px;
  outline: none;
  transition: border-color var(--transition);
}

.form-group input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  text-decoration: none;
}

.btn-primary {
  background: var(--accent);
  color: white;
  width: 100%;
}
.btn-primary:hover { background: #ea6c0a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249,115,22,0.3); }

.btn-break {
  padding: 16px 20px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 15px;
  width: 100%;
  text-align: left;
}
.btn-break:hover { border-color: var(--border-light); background: var(--bg-card-hover); transform: translateY(-1px); }
.btn-break .break-icon { font-size: 22px; }
.btn-break .break-max { font-size: 12px; color: var(--text-muted); }

.btn-end {
  background: var(--danger);
  color: white;
  width: 100%;
  padding: 16px;
  font-size: 16px;
  border-radius: var(--radius);
}
.btn-end:hover { background: #dc2626; }

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 8px 16px;
  font-size: 13px;
}
.btn-ghost:hover { border-color: var(--border-light); color: var(--text-primary); }

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
}

.error-msg {
  background: var(--danger-glow);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 16px;
}

/* Layout */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-logo span { color: var(--accent); }

.topbar-tabs {
  display: flex;
  gap: 4px;
}

.topbar-tab {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.topbar-tab:hover { color: var(--text-primary); background: var(--bg-card); }
.topbar-tab.active { color: var(--accent); background: var(--accent-glow); }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background: var(--accent);
  flex-shrink: 0;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: 11px;
}

.user-info {
  text-align: right;
}
.user-info .name { font-size: 14px; font-weight: 600; }
.user-info .role { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

/* Main content */
.main {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Timer Display */
.timer-display {
  text-align: center;
  padding: 40px 20px;
}

.timer-type {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.timer-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 64px;
  font-weight: 600;
  letter-spacing: -2px;
  line-height: 1;
  margin-bottom: 8px;
}

.timer-started {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.timer-progress {
  width: 100%;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 24px;
}

.timer-progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 1s linear, background-color 500ms;
}

.status-on-break {
  color: var(--warning);
}

.status-overtime {
  color: var(--danger);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.agent-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  transition: all var(--transition);
}
.agent-card:hover { border-color: var(--border-light); }

.agent-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.agent-card .agent-name {
  font-weight: 600;
  font-size: 15px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-available {
  background: var(--success-glow);
  color: var(--success);
}

.status-on-break-badge {
  background: var(--warning-glow);
  color: var(--warning);
}

.status-overtime-badge {
  background: var(--danger-glow);
  color: var(--danger);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-offline {
  background: rgba(100,116,139,0.15);
  color: #94a3b8;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.agent-timer {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 600;
  margin: 8px 0;
}

.agent-break-type {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-progress {
  width: 100%;
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
}

.agent-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 1s linear, background-color 500ms;
}

/* Stats row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  text-align: center;
}

.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 600;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* History */
.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.history-table td {
  padding: 12px;
  font-size: 14px;
  border-bottom: 1px solid rgba(42,58,82,0.5);
}

.history-table tr:hover td {
  background: var(--bg-card-hover);
}

.break-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-elevated);
}

.overtime-tag {
  color: var(--danger);
  font-weight: 600;
}

/* Break grid */
.break-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}
.empty-state .icon { font-size: 40px; margin-bottom: 12px; }
.empty-state .msg { font-size: 14px; }

/* Manage Users */
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(42,58,82,0.5);
}
.user-row:last-child { border-bottom: none; }

.user-row-info { flex: 1; }
.user-row-info .name { font-weight: 600; font-size: 14px; }
.user-row-info .meta { font-size: 12px; color: var(--text-muted); }

.add-user-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  align-items: end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.add-user-form input {
  padding: 8px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.add-user-form input:focus { border-color: var(--accent); }

/* Responsive */
@media (max-width: 768px) {
  .topbar { padding: 0 16px; }
  .topbar-tabs { display: none; }
  .mobile-tabs {
    display: flex !important;
    overflow-x: auto;
    gap: 4px;
    padding: 8px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }
  .main { padding: 16px; }
  .break-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: 1fr 1fr; }
  .timer-value { font-size: 48px; }
  .add-user-form { grid-template-columns: 1fr; }
  .dashboard-grid { grid-template-columns: 1fr; }
  .user-info { display: none; }
}

.mobile-tabs { display: none; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* Live dot */
.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  margin-right: 6px;
  animation: livePulse 2s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}

.notification {
  position: fixed;
  top: 72px;
  right: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 20px;
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  z-index: 1000;
  animation: slideIn 300ms ease-out;
  max-width: 320px;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState(() => LS.get('br_users', DEFAULT_USERS))
  const [currentUser, setCurrentUser] = useState(() => LS.get('br_session', null))
  const [breaks, setBreaks] = useState(() => LS.get('br_breaks', {})) // { odId: { userId, type, startTime, endTime? } }
  const [history, setHistory] = useState(() => LS.get('br_history', [])) // completed breaks
  const [tab, setTab] = useState('my-break')
  const [now, setNow] = useState(Date.now())
  const [notification, setNotification] = useState(null)

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Persist
  useEffect(() => { LS.set('br_users', users) }, [users])
  useEffect(() => { LS.set('br_breaks', breaks) }, [breaks])
  useEffect(() => { LS.set('br_history', history) }, [history])
  useEffect(() => { if (currentUser) LS.set('br_session', currentUser); else localStorage.removeItem('br_session') }, [currentUser])

  // Notification helper
  const notify = useCallback((msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // ─── Auth ────────────────────────────────────────────────────
  const handleLogin = useCallback((username, password) => {
    const user = users.find(u => u.username === username && u.password === password)
    if (user) { setCurrentUser(user); return true }
    return false
  }, [users])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    setTab('my-break')
  }, [])

  // ─── Break Actions ──────────────────────────────────────────
  const myActiveBreak = useMemo(() => {
    if (!currentUser) return null
    return Object.entries(breaks).find(([, b]) => b.userId === currentUser.id && !b.endTime)?.[1] || null
  }, [breaks, currentUser])

  const startBreak = useCallback((type) => {
    if (!currentUser || myActiveBreak) return
    const id = `${currentUser.id}-${Date.now()}`
    const newBreak = { id, userId: currentUser.id, userName: currentUser.name, type, startTime: Date.now(), endTime: null }
    setBreaks(prev => ({ ...prev, [id]: newBreak }))
    notify(`${BREAK_TYPES[type].icon} ${BREAK_TYPES[type].label} started`)
  }, [currentUser, myActiveBreak, notify])

  const endBreak = useCallback(() => {
    if (!currentUser || !myActiveBreak) return
    const endTime = Date.now()
    const completed = { ...myActiveBreak, endTime, duration: endTime - myActiveBreak.startTime }
    setBreaks(prev => {
      const next = { ...prev }
      delete next[myActiveBreak.id]
      return next
    })
    setHistory(prev => [completed, ...prev])
    notify(`✅ Break ended — ${formatDuration(completed.duration)}`)
  }, [currentUser, myActiveBreak, notify])

  // Admin: force end someone's break
  const forceEndBreak = useCallback((breakId) => {
    const b = breaks[breakId]
    if (!b) return
    const endTime = Date.now()
    const completed = { ...b, endTime, duration: endTime - b.startTime, forcedBy: currentUser?.name }
    setBreaks(prev => {
      const next = { ...prev }
      delete next[breakId]
      return next
    })
    setHistory(prev => [completed, ...prev])
    notify(`⚠️ Ended ${b.userName}'s break`)
  }, [breaks, currentUser, notify])

  // ─── User Management ────────────────────────────────────────
  const addUser = useCallback((name, username, password) => {
    const id = String(Date.now())
    const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setUsers(prev => [...prev, { id, username, name, role: 'agent', password, avatar }])
    notify(`👤 ${name} added`)
  }, [notify])

  const removeUser = useCallback((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    // Clean up any active breaks
    setBreaks(prev => {
      const next = { ...prev }
      Object.entries(next).forEach(([k, v]) => { if (v.userId === userId) delete next[k] })
      return next
    })
  }, [])

  if (!currentUser) {
    return (
      <>
        <style>{CSS}</style>
        <LoginScreen onLogin={handleLogin} />
      </>
    )
  }

  const isAdmin = currentUser.role === 'admin'
  const tabs = [
    { id: 'my-break', label: 'My Break' },
    { id: 'dashboard', label: 'Live Dashboard' },
    { id: 'history', label: 'History' },
    ...(isAdmin ? [{ id: 'manage', label: 'Manage Users' }] : []),
  ]

  return (
    <>
      <style>{CSS}</style>
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
            <div className="user-info">
              <div className="name">{currentUser.name}</div>
              <div className="role">{currentUser.role}</div>
            </div>
            <div className="avatar">{currentUser.avatar}</div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="mobile-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`topbar-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <main className="main">
          {tab === 'my-break' && (
            <MyBreakTab
              activeBreak={myActiveBreak}
              now={now}
              onStartBreak={startBreak}
              onEndBreak={endBreak}
              todayHistory={history.filter(h => h.userId === currentUser.id && new Date(h.startTime).toISOString().split('T')[0] === getToday())}
            />
          )}
          {tab === 'dashboard' && (
            <DashboardTab
              users={users}
              breaks={breaks}
              now={now}
              isAdmin={isAdmin}
              onForceEnd={forceEndBreak}
            />
          )}
          {tab === 'history' && (
            <HistoryTab
              history={history}
              isAdmin={isAdmin}
              currentUserId={currentUser.id}
            />
          )}
          {tab === 'manage' && isAdmin && (
            <ManageUsersTab
              users={users}
              onAddUser={addUser}
              onRemoveUser={removeUser}
              currentUserId={currentUser.id}
            />
          )}
        </main>

        {notification && <div className="notification">{notification}</div>}
      </div>
    </>
  )
}

// ─── Login Screen ────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!onLogin(username, password)) {
      setError('Invalid credentials. Try again.')
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1>☕ BreakRoom</h1>
        <p className="subtitle">Team Break & Lunch Tracker</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }} placeholder="Enter username" autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Enter password" />
          </div>
          <button type="submit" className="btn btn-primary">Sign In</button>
        </form>
        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Demo Credentials</strong><br />
          Admin: george / admin123<br />
          Agent: agent1 / agent123
        </div>
      </div>
    </div>
  )
}

// ─── My Break Tab ────────────────────────────────────────────────
function MyBreakTab({ activeBreak, now, onStartBreak, onEndBreak, todayHistory }) {
  if (activeBreak) {
    const elapsed = now - activeBreak.startTime
    const breakInfo = BREAK_TYPES[activeBreak.type]
    const maxMs = breakInfo.maxMinutes * 60 * 1000
    const pct = Math.min((elapsed / maxMs) * 100, 100)
    const overtime = elapsed > maxMs

    return (
      <>
        <div className="card">
          <div className="timer-display">
            <div className="timer-type">
              <span>{breakInfo.icon}</span>
              <span>{breakInfo.label}</span>
            </div>
            <div className={`timer-value mono ${overtime ? 'status-overtime' : 'status-on-break'}`}>
              {formatDuration(elapsed)}
            </div>
            <div className="timer-started">
              Started at {formatTime(activeBreak.startTime)} · Max {breakInfo.maxMinutes} min
              {overtime && <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · ⚠️ OVERTIME</span>}
            </div>
            <div className="timer-progress">
              <div
                className="timer-progress-bar"
                style={{
                  width: `${pct}%`,
                  backgroundColor: overtime ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : breakInfo.color,
                }}
              />
            </div>
            <button className="btn btn-end" onClick={onEndBreak}>
              ⏹ End Break
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Start a Break</div>
            <div className="card-subtitle">Select your break type below</div>
          </div>
          <span className="status-badge status-available"><span className="status-dot" /> Available</span>
        </div>
        <div className="break-grid">
          {Object.entries(BREAK_TYPES).map(([key, bt]) => (
            <button key={key} className="btn btn-break" onClick={() => onStartBreak(key)}>
              <span className="break-icon">{bt.icon}</span>{' '}
              <strong>{bt.label}</strong>
              <span className="break-max"> · Max {bt.maxMinutes}min</span>
            </button>
          ))}
        </div>
      </div>

      {todayHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Today's Breaks</div>
          </div>
          <table className="history-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {todayHistory.map((h, i) => {
                const info = BREAK_TYPES[h.type]
                const maxMs = info.maxMinutes * 60 * 1000
                const isOT = h.duration > maxMs
                return (
                  <tr key={i}>
                    <td><span className="break-tag">{info.icon} {info.label}</span></td>
                    <td>{formatTime(h.startTime)}</td>
                    <td>{formatTime(h.endTime)}</td>
                    <td className={isOT ? 'overtime-tag' : ''}>
                      {formatDuration(h.duration)} {isOT && '⚠️'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Dashboard Tab ───────────────────────────────────────────────
function DashboardTab({ users, breaks, now, isAdmin, onForceEnd }) {
  const activeBreaks = Object.values(breaks).filter(b => !b.endTime)
  const onBreakCount = activeBreaks.length
  const overtimeCount = activeBreaks.filter(b => {
    const elapsed = now - b.startTime
    return elapsed > BREAK_TYPES[b.type].maxMinutes * 60 * 1000
  }).length

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{users.length}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{users.length - onBreakCount}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{onBreakCount}</div>
          <div className="stat-label">On Break</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{overtimeCount}</div>
          <div className="stat-label">Overtime</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><span className="live-dot" />Live Agent Status</div>
        </div>
        <div className="dashboard-grid">
          {users.map(user => {
            const activeBreak = activeBreaks.find(b => b.userId === user.id)
            if (activeBreak) {
              const elapsed = now - activeBreak.startTime
              const info = BREAK_TYPES[activeBreak.type]
              const maxMs = info.maxMinutes * 60 * 1000
              const pct = Math.min((elapsed / maxMs) * 100, 100)
              const overtime = elapsed > maxMs

              return (
                <div key={user.id} className="agent-card" style={{ borderColor: overtime ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)' }}>
                  <div className="agent-card-header">
                    <div className="avatar avatar-sm" style={{ background: info.color }}>{user.avatar}</div>
                    <div>
                      <div className="agent-name">{user.name}</div>
                      <span className={`status-badge ${overtime ? 'status-overtime-badge' : 'status-on-break-badge'}`}>
                        <span className="status-dot" />
                        {overtime ? 'Overtime' : 'On Break'}
                      </span>
                    </div>
                  </div>
                  <div className="agent-break-type">{info.icon} {info.label} · Max {info.maxMinutes}m</div>
                  <div className={`agent-timer ${overtime ? 'status-overtime' : 'status-on-break'}`}>
                    {formatDuration(elapsed)}
                  </div>
                  <div className="agent-progress">
                    <div
                      className="agent-progress-bar"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: overtime ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : info.color,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Started {formatTime(activeBreak.startTime)}
                  </div>
                  {isAdmin && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 8, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => onForceEnd(activeBreak.id)}
                    >
                      ⏹ End Break
                    </button>
                  )}
                </div>
              )
            }

            return (
              <div key={user.id} className="agent-card">
                <div className="agent-card-header">
                  <div className="avatar avatar-sm">{user.avatar}</div>
                  <div>
                    <div className="agent-name">{user.name}</div>
                    <span className="status-badge status-available">
                      <span className="status-dot" /> Available
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── History Tab ─────────────────────────────────────────────────
function HistoryTab({ history: allHistory, isAdmin, currentUserId }) {
  const [filter, setFilter] = useState('all')
  const items = isAdmin
    ? allHistory
    : allHistory.filter(h => h.userId === currentUserId)

  const filtered = filter === 'all' ? items : items.filter(h => h.type === filter)

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Break History</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-ghost btn-sm ${filter === 'all' ? 'active' : ''}`} style={filter === 'all' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter('all')}>All</button>
          {Object.entries(BREAK_TYPES).map(([key, bt]) => (
            <button key={key} className={`btn btn-ghost btn-sm`} style={filter === key ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter(key)}>
              {bt.icon}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <div className="msg">No break history yet</div>
        </div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              {isAdmin && <th>Agent</th>}
              <th>Type</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((h, i) => {
              const info = BREAK_TYPES[h.type]
              const maxMs = info.maxMinutes * 60 * 1000
              const isOT = h.duration > maxMs
              return (
                <tr key={i}>
                  {isAdmin && <td style={{ fontWeight: 500 }}>{h.userName}</td>}
                  <td><span className="break-tag">{info.icon} {info.label}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(h.startTime).toLocaleDateString()}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{formatTime(h.startTime)}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{formatTime(h.endTime)}</td>
                  <td className={`mono ${isOT ? 'overtime-tag' : ''}`} style={{ fontSize: 13 }}>
                    {formatDuration(h.duration)}
                  </td>
                  <td>
                    {isOT ? (
                      <span className="status-badge status-overtime-badge">Overtime</span>
                    ) : (
                      <span className="status-badge status-available">OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Manage Users Tab ────────────────────────────────────────────
function ManageUsersTab({ users, onAddUser, onRemoveUser, currentUserId }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleAdd = () => {
    if (!name.trim() || !username.trim() || !password.trim()) return
    onAddUser(name.trim(), username.trim(), password.trim())
    setName(''); setUsername(''); setPassword('')
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Manage Users</div>
          <div className="card-subtitle">{users.length} registered users</div>
        </div>
      </div>

      {users.map(u => (
        <div key={u.id} className="user-row">
          <div className="avatar avatar-sm">{u.avatar}</div>
          <div className="user-row-info">
            <div className="name">{u.name}</div>
            <div className="meta">@{u.username} · {u.role} {u.id === currentUserId && '(you)'}</div>
          </div>
          {u.id !== currentUserId && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onRemoveUser(u.id)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <div className="add-user-form">
        <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={handleAdd}>
          + Add
        </button>
      </div>
    </div>
  )
}
