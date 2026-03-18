import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { db, ref, set, onValue, remove, get } from './firebase'

// ─── Defaults ────────────────────────────────────────────────────
const DEFAULT_BREAK_TYPES = {
  working_ticket: { label: 'Working Ticket', icon: '🎫', maxMinutes: 480, color: '#2563eb', requiresTicket: true },
  lunch: { label: 'Lunch', icon: '🍽️', maxMinutes: 60, color: '#e67e22' },
  break15: { label: '15 Min Break', icon: '☕', maxMinutes: 15, color: '#3498db' },
  break10: { label: '10 Min Break', icon: '⏸️', maxMinutes: 10, color: '#9b59b6' },
  personal: { label: 'Personal', icon: '🚶', maxMinutes: 30, color: '#1abc9c' },
}
const ICON_OPTIONS = ['🎫','🍽️','☕','⏸️','🚶','📚','🏋️','🩺','📞','🧘','💼','🎯','🔧','🚗','🛒','💊','🎓','🧑‍💻','🏠','⚡','🌙']
const COLOR_OPTIONS = ['#e67e22','#3498db','#9b59b6','#1abc9c','#e74c3c','#2ecc71','#f39c12','#e84393','#00cec9','#6c5ce7','#fd79a8','#636e72']
const DEFAULT_USERS = {
  u1: { id:'u1', username:'rafa', name:'Rafa', role:'admin', password:'admin123', avatar:'R' },
  u2: { id:'u2', username:'agent1', name:'Agent One', role:'agent', password:'agent123', avatar:'A1' },
  u3: { id:'u3', username:'agent2', name:'Agent Two', role:'agent', password:'agent123', avatar:'A2' },
  u4: { id:'u4', username:'agent3', name:'Agent Three', role:'agent', password:'agent123', avatar:'A3' },
  u5: { id:'u5', username:'agent4', name:'Agent Four', role:'agent', password:'agent123', avatar:'A4' },
}

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(ms){if(ms<0)ms=0;const t=Math.floor(ms/1000),h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;if(h>0)return`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;return`${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`}
function fmtTime(ts){return new Date(ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}
function today(){return new Date().toISOString().split('T')[0]}
function greeting(){const h=new Date().getHours();if(h<12)return'Good morning';if(h<17)return'Good afternoon';return'Good evening'}
function objArr(o){return o?Object.values(o):[]}

// Notification sound using Web Audio API
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(587, ctx.currentTime)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
  } catch(e) {}
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function sendBrowserNotif(title, body) {
  playNotifSound()
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '☕' })
  }
}

// ─── Styles ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
:root{--bg-deep:#0a0e17;--bg-surface:#111827;--bg-card:#1a2332;--bg-card-hover:#1f2b3d;--bg-elevated:#243044;--border:#2a3a52;--border-light:#334766;--text-primary:#f0f4f8;--text-secondary:#8899aa;--text-muted:#5a6b7d;--accent:#f97316;--accent-glow:rgba(249,115,22,0.15);--success:#22c55e;--success-glow:rgba(34,197,94,0.15);--warning:#eab308;--warning-glow:rgba(234,179,8,0.15);--danger:#ef4444;--danger-glow:rgba(239,68,68,0.15);--info:#3b82f6;--info-glow:rgba(59,130,246,0.15);--radius:12px;--radius-sm:8px;--radius-lg:16px;--shadow:0 4px 24px rgba(0,0,0,0.3);--shadow-lg:0 8px 40px rgba(0,0,0,0.4);--transition:200ms cubic-bezier(0.4,0,0.2,1)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg-deep);color:var(--text-primary);min-height:100vh;-webkit-font-smoothing:antialiased}
.mono{font-family:'JetBrains Mono',monospace}
.login-wrapper{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 20% 50%,rgba(249,115,22,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 50%,rgba(59,130,246,0.06) 0%,transparent 50%),var(--bg-deep);padding:20px}
.login-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:48px 40px;width:100%;max-width:420px;box-shadow:var(--shadow-lg)}
.login-card h1{font-size:28px;font-weight:700;margin-bottom:4px;letter-spacing:-0.5px}
.login-card .subtitle{color:var(--text-secondary);margin-bottom:32px;font-size:14px}
.fg{margin-bottom:20px}
.fg label{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);margin-bottom:8px}
.fg input,.fg select,.fg textarea{width:100%;padding:12px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:15px;outline:none;transition:border-color var(--transition)}
.fg textarea{resize:vertical;min-height:60px}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:none;border-radius:var(--radius-sm);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all var(--transition)}
.btn-primary{background:var(--accent);color:white;width:100%}
.btn-primary:hover{background:#ea6c0a;transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,0.3)}
.btn-break{padding:16px 20px;border-radius:var(--radius);background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);font-size:15px;width:100%;text-align:left}
.btn-break:hover{border-color:var(--border-light);background:var(--bg-card-hover);transform:translateY(-1px)}
.btn-break .break-icon{font-size:22px}
.btn-break .break-max{font-size:12px;color:var(--text-muted)}
.btn-end{background:var(--danger);color:white;width:100%;padding:16px;font-size:16px;border-radius:var(--radius)}
.btn-end:hover{background:#dc2626}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:8px 16px;font-size:13px}
.btn-ghost:hover{border-color:var(--border-light);color:var(--text-primary)}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:6px}
.btn-success{background:var(--success);color:white}
.btn-success:hover{background:#16a34a}
.btn-info{background:var(--info);color:white}
.btn-info:hover{background:#2563eb}
.error-msg{background:var(--danger-glow);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:16px}
.app-layout{min-height:100vh;display:flex;flex-direction:column}
.topbar{background:var(--bg-surface);border-bottom:1px solid var(--border);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}
.topbar-left{display:flex;align-items:center;gap:16px}
.topbar-logo{font-size:20px;font-weight:700;letter-spacing:-0.5px;display:flex;align-items:center;gap:8px}
.topbar-logo span{color:var(--accent)}
.topbar-tabs{display:flex;gap:4px}
.topbar-tab{padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;color:var(--text-secondary);background:transparent;border:none;cursor:pointer;transition:all var(--transition);font-family:inherit}
.topbar-tab:hover{color:var(--text-primary);background:var(--bg-card)}
.topbar-tab.active{color:var(--accent);background:var(--accent-glow)}
.topbar-right{display:flex;align-items:center;gap:12px}
.avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;background:var(--accent);flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:11px}
.avatar-lg{width:56px;height:56px;font-size:22px}
.user-info{text-align:right}
.user-info .name{font-size:14px;font-weight:600}
.user-info .role{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
.main{flex:1;padding:24px;max-width:1200px;margin:0 auto;width:100%}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.card-title{font-size:16px;font-weight:600}
.card-subtitle{font-size:12px;color:var(--text-muted);margin-top:2px}
.timer-display{text-align:center;padding:40px 20px}
.timer-type{font-size:16px;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:8px}
.timer-value{font-family:'JetBrains Mono',monospace;font-size:64px;font-weight:600;letter-spacing:-2px;line-height:1;margin-bottom:8px}
.timer-started{font-size:13px;color:var(--text-muted);margin-bottom:24px}
.timer-progress{width:100%;height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden;margin-bottom:24px}
.timer-progress-bar{height:100%;border-radius:3px;transition:width 1s linear,background-color 500ms}
.status-on-break{color:var(--warning)}
.status-overtime{color:var(--danger);animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.dashboard-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px}
.agent-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:all var(--transition)}
.agent-card:hover{border-color:var(--border-light)}
.agent-card-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.agent-card .agent-name{font-weight:600;font-size:15px}
.status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.status-available{background:var(--success-glow);color:var(--success)}
.status-on-break-badge{background:var(--warning-glow);color:var(--warning)}
.status-working-badge{background:var(--info-glow);color:var(--info)}
.status-overtime-badge{background:var(--danger-glow);color:var(--danger);animation:pulse 1.5s ease-in-out infinite}
.status-offline-badge{background:rgba(100,116,139,0.15);color:#94a3b8}
.status-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.agent-timer{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600;margin:8px 0}
.agent-break-type{font-size:13px;color:var(--text-secondary)}
.agent-progress{width:100%;height:4px;background:var(--bg-elevated);border-radius:2px;overflow:hidden;margin-top:12px}
.agent-progress-bar{height:100%;border-radius:2px;transition:width 1s linear,background-color 500ms}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px}
.stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;text-align:center}
.stat-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600}
.stat-label{font-size:12px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}
.history-table{width:100%;border-collapse:collapse}
.history-table th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);padding:8px 12px;border-bottom:1px solid var(--border)}
.history-table td{padding:12px;font-size:14px;border-bottom:1px solid rgba(42,58,82,0.5)}
.history-table tr:hover td{background:var(--bg-card-hover)}
.break-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:500;background:var(--bg-elevated)}
.overtime-tag{color:var(--danger);font-weight:600}
.break-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.empty-state{text-align:center;padding:40px;color:var(--text-muted)}
.empty-state .icon{font-size:40px;margin-bottom:12px}
.empty-state .msg{font-size:14px}
.user-row{display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid rgba(42,58,82,0.5)}
.user-row:last-child{border-bottom:none}
.user-row-info{flex:1}
.user-row-info .name{font-weight:600;font-size:14px}
.user-row-info .meta{font-size:12px;color:var(--text-muted)}
.add-user-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.add-user-form input{padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px;outline:none}
.add-user-form input:focus{border-color:var(--accent)}
.category-row{display:flex;align-items:center;gap:12px;padding:14px 12px;border-bottom:1px solid rgba(42,58,82,0.5);transition:background var(--transition)}
.category-row:hover{background:var(--bg-card-hover)}
.category-row:last-child{border-bottom:none}
.category-icon{width:40px;height:40px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.category-info{flex:1}
.category-info .name{font-weight:600;font-size:14px}
.category-info .meta{font-size:12px;color:var(--text-muted)}
.category-actions{display:flex;gap:6px}
.icon-picker,.color-picker{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.icon-option{width:36px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-surface);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all var(--transition)}
.icon-option:hover{border-color:var(--border-light);background:var(--bg-elevated)}
.icon-option.selected{border-color:var(--accent);background:var(--accent-glow)}
.color-option{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all var(--transition)}
.color-option:hover{transform:scale(1.2)}
.color-option.selected{border-color:var(--text-primary);box-shadow:0 0 0 2px var(--bg-card)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(4px)}
.modal{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:32px;width:100%;max-width:480px;box-shadow:var(--shadow-lg);animation:modalIn 200ms ease-out;max-height:90vh;overflow-y:auto}
@keyframes modalIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}
.modal h2{font-size:20px;font-weight:700;margin-bottom:20px}
.modal-actions{display:flex;gap:8px;margin-top:24px;justify-content:flex-end}
.home-greeting{font-size:32px;font-weight:700;letter-spacing:-1px;margin-bottom:4px}
.home-clock{font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:600;color:var(--accent);letter-spacing:-2px}
.home-date{font-size:14px;color:var(--text-muted);margin-top:4px}
.ticket-card{padding:14px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;transition:all var(--transition)}
.ticket-card:hover{border-color:var(--border-light)}
.ticket-card .ticket-id{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--info)}
.ticket-card .ticket-subject{font-size:14px;font-weight:500;margin-top:2px}
.ticket-card .ticket-priority{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
.priority-high{background:var(--danger-glow);color:var(--danger)}
.priority-medium{background:var(--warning-glow);color:var(--warning)}
.priority-low{background:var(--success-glow);color:var(--success)}
.priority-normal{background:rgba(100,116,139,0.15);color:#94a3b8}
.clockin-btn{padding:20px 32px;font-size:18px;border-radius:var(--radius);font-weight:700;letter-spacing:-0.3px}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:12px}
.cal-header{font-size:11px;font-weight:600;color:var(--text-muted);text-align:center;padding:4px}
.cal-day{text-align:center;padding:8px 4px;border-radius:var(--radius-sm);font-size:13px;cursor:pointer;transition:all var(--transition);border:1px solid transparent}
.cal-day:hover{background:var(--bg-elevated);border-color:var(--border)}
.cal-day.today{background:var(--accent-glow);color:var(--accent);font-weight:700;border-color:var(--accent)}
.cal-day.has-tickets{position:relative}
.cal-day.has-tickets::after{content:'';position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--info)}
.cal-day.other-month{color:var(--text-muted);opacity:0.4}
.cal-day.selected{background:var(--info-glow);border-color:var(--info);color:var(--info)}
.sync-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success);margin-right:6px}
.loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:var(--text-muted)}
.spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--success);margin-right:6px;animation:livePulse 2s ease-in-out infinite}
@keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}
.notification{position:fixed;top:72px;right:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;box-shadow:var(--shadow-lg);font-size:14px;z-index:1000;animation:slideIn 300ms ease-out;max-width:320px}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@media(max-width:768px){
  .topbar{padding:0 12px}.topbar-tabs{display:none}
  .mobile-tabs{display:flex!important;overflow-x:auto;gap:4px;padding:8px 16px;background:var(--bg-surface);border-bottom:1px solid var(--border)}
  .main{padding:16px}.break-grid{grid-template-columns:1fr}.stats-row{grid-template-columns:1fr 1fr}
  .timer-value{font-size:48px}.home-clock{font-size:36px}
  .add-user-form{grid-template-columns:1fr}.dashboard-grid{grid-template-columns:1fr}
  .user-info{display:none}
}
.mobile-tabs{display:none}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.chat-container{display:flex;flex-direction:column;height:calc(100vh - 160px);max-height:600px}
.chat-messages{flex:1;overflow-y:auto;padding:16px 0;display:flex;flex-direction:column;gap:8px}
.chat-msg{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;border-radius:var(--radius-sm);transition:background var(--transition)}
.chat-msg:hover{background:var(--bg-card-hover)}
.chat-msg .msg-name{font-size:12px;font-weight:600;color:var(--accent)}
.chat-msg .msg-text{font-size:14px;margin-top:2px;line-height:1.5}
.chat-msg .msg-time{font-size:11px;color:var(--text-muted);margin-top:2px}
.chat-input-row{display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)}
.chat-input{flex:1;padding:12px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:14px;outline:none}
.chat-input:focus{border-color:var(--accent)}
.weather-widget{display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--bg-elevated);border-radius:var(--radius);margin-bottom:20px}
.weather-temp{font-family:'JetBrains Mono',monospace;font-size:36px;font-weight:600}
.weather-info{flex:1}
.weather-desc{font-size:14px;text-transform:capitalize}
.weather-details{font-size:12px;color:var(--text-muted);margin-top:2px}
.weather-icon{font-size:40px}
`

// ─── Firebase init ───────────────────────────────────────────────
async function initDB() {
  const s = await get(ref(db, 'users'))
  if (!s.exists()) {
    await set(ref(db, 'users'), DEFAULT_USERS)
    await set(ref(db, 'breakTypes'), DEFAULT_BREAK_TYPES)
  }
}

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState({})
  const [currentUser, setCU] = useState(() => { try { return JSON.parse(localStorage.getItem('br_session')) } catch { return null } })
  const [breakTypes, setBT] = useState({})
  const [breaks, setBreaks] = useState({})
  const [history, setHistory] = useState({})
  const [currentTickets, setCT] = useState({})
  const [clockIns, setClockIns] = useState({})
  const [assignments, setAssignments] = useState({})
  const [chatMsgs, setChatMsgs] = useState({})
  const [tab, setTab] = useState('home')
  const [now, setNow] = useState(Date.now())
  const [notif, setNotif] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initDB().then(() => {
      onValue(ref(db, 'users'), s => s.exists() && setUsers(s.val()))
      onValue(ref(db, 'breakTypes'), s => setBT(s.exists() ? s.val() : DEFAULT_BREAK_TYPES))
      onValue(ref(db, 'breaks'), s => setBreaks(s.exists() ? s.val() : {}))
      onValue(ref(db, 'history'), s => setHistory(s.exists() ? s.val() : {}))
      onValue(ref(db, 'currentTickets'), s => setCT(s.exists() ? s.val() : {}))
      onValue(ref(db, 'clockIns'), s => setClockIns(s.exists() ? s.val() : {}))
      onValue(ref(db, 'assignments'), s => setAssignments(s.exists() ? s.val() : {}))
      onValue(ref(db, 'chatMessages'), s => setChatMsgs(s.exists() ? s.val() : {}))
      setLoading(false)
    })
  }, [])

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (currentUser) localStorage.setItem('br_session', JSON.stringify(currentUser)); else localStorage.removeItem('br_session') }, [currentUser])
  useEffect(() => { requestNotifPermission() }, [])

  const notify = useCallback(m => { setNotif(m); setTimeout(() => setNotif(null), 3000) }, [])
  const handleLogin = useCallback((u, p) => { const user = Object.values(users).find(x => x.username === u && x.password === p); if (user) { setCU(user); requestNotifPermission(); return true } return false }, [users])
  const handleLogout = useCallback(() => { setCU(null); setTab('home') }, [])

  // Watch for break changes and send browser notifications
  const prevBreaksRef = React.useRef({})
  useEffect(() => {
    if (!currentUser) return
    const prev = prevBreaksRef.current
    const curr = breaks
    // Find new breaks that weren't in prev (someone just went on break)
    Object.entries(curr).forEach(([id, b]) => {
      if (!prev[id] && b.endTime === 0 && b.userId !== currentUser.id) {
        const bt = breakTypes[b.type]
        sendBrowserNotif(`${bt?.icon || '⏸️'} ${b.userName} went on ${bt?.label || 'break'}`, bt?.requiresTicket && b.ticketNumber ? `Working on ticket #${b.ticketNumber}` : `Started at ${fmtTime(b.startTime)}`)
      }
    })
    // Find breaks that were removed (someone ended break)
    Object.entries(prev).forEach(([id, b]) => {
      if (!curr[id] && b.userId !== currentUser.id) {
        sendBrowserNotif(`✅ ${b.userName} is back`, `Ended ${breakTypes[b.type]?.label || 'break'}`)
      }
    })
    prevBreaksRef.current = { ...curr }
  }, [breaks, currentUser, breakTypes])

  const myBreak = useMemo(() => currentUser ? Object.values(breaks).find(b => b.userId === currentUser.id && b.endTime === 0) || null : null, [breaks, currentUser])

  // Clock In/Out
  const myClock = useMemo(() => {
    if (!currentUser) return null
    const todayKey = today()
    const entry = Object.values(clockIns).find(c => c.userId === currentUser.id && c.date === todayKey && c.clockOut === 0)
    return entry || null
  }, [clockIns, currentUser])

  const clockIn = useCallback(() => {
    if (!currentUser || myClock) return
    const id = `ci_${currentUser.id}_${Date.now()}`
    set(ref(db, `clockIns/${id}`), { id, userId: currentUser.id, userName: currentUser.name, date: today(), clockIn: Date.now(), clockOut: 0 })
    notify('🟢 Clocked in!')
  }, [currentUser, myClock, notify])

  const clockOut = useCallback(() => {
    if (!currentUser || !myClock) return
    set(ref(db, `clockIns/${myClock.id}/clockOut`), Date.now())
    notify('🔴 Clocked out!')
  }, [currentUser, myClock, notify])

  // Break actions
  const startBreak = useCallback((type, ticket) => {
    if (!currentUser || myBreak) return
    const bt = breakTypes[type]; if (!bt) return
    const id = `${currentUser.id}_${Date.now()}`
    set(ref(db, `breaks/${id}`), { id, userId: currentUser.id, userName: currentUser.name, type, startTime: Date.now(), endTime: 0, ticketNumber: ticket || '' })
    if (ticket) set(ref(db, `currentTickets/${currentUser.id}`), ticket)
    notify(`${bt.icon} ${bt.label} started${ticket ? ` — #${ticket}` : ''}`)
  }, [currentUser, myBreak, breakTypes, notify])

  const endBreak = useCallback(() => {
    if (!currentUser || !myBreak) return
    const end = Date.now(), dur = end - myBreak.startTime, hId = `h_${Date.now()}`
    set(ref(db, `history/${hId}`), { ...myBreak, endTime: end, duration: dur })
    remove(ref(db, `breaks/${myBreak.id}`))
    const bt = breakTypes[myBreak.type]
    if (bt?.requiresTicket) remove(ref(db, `currentTickets/${currentUser.id}`))
    notify(`✅ ${bt?.requiresTicket ? 'Ticket done' : 'Break ended'} — ${fmt(dur)}`)
  }, [currentUser, myBreak, breakTypes, notify])

  const forceEnd = useCallback(bid => {
    const b = breaks[bid]; if (!b) return
    const end = Date.now(); set(ref(db, `history/h_${end}`), { ...b, endTime: end, duration: end - b.startTime, forcedBy: currentUser?.name })
    remove(ref(db, `breaks/${bid}`)); notify(`⚠️ Ended ${b.userName}'s break`)
  }, [breaks, currentUser, notify])

  const setUserTicket = useCallback(t => { if (!currentUser) return; t ? set(ref(db, `currentTickets/${currentUser.id}`), t) : remove(ref(db, `currentTickets/${currentUser.id}`)) }, [currentUser])

  // User CRUD
  const addUser = useCallback((n, u, p) => { const id = `u_${Date.now()}`, av = n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); set(ref(db, `users/${id}`), { id, username: u, name: n, role: 'agent', password: p, avatar: av }); notify(`👤 ${n} added`) }, [notify])
  const removeUser = useCallback(uid => { remove(ref(db, `users/${uid}`)); Object.entries(breaks).forEach(([k, v]) => { if (v.userId === uid) remove(ref(db, `breaks/${k}`)) }) }, [breaks])
  const editUser = useCallback((uid, fields) => { Object.entries(fields).forEach(([k, v]) => set(ref(db, `users/${uid}/${k}`), v)); notify(`✏️ User updated`) }, [notify])

  // Break type CRUD
  const addBT = useCallback((k, d) => { set(ref(db, `breakTypes/${k}`), d); notify(`${d.icon} "${d.label}" added`) }, [notify])
  const updateBT = useCallback((k, d) => { set(ref(db, `breakTypes/${k}`), d); notify(`✏️ "${d.label}" updated`) }, [notify])
  const removeBT = useCallback(k => { const bt = breakTypes[k]; if (Object.values(breaks).find(b => b.type === k && b.endTime === 0)) { notify(`❌ Can't delete — in use`); return }; remove(ref(db, `breakTypes/${k}`)); notify(`🗑️ "${bt?.label}" deleted`) }, [breakTypes, breaks, notify])

  // Ticket assignment
  const assignTicket = useCallback((userId, ticketId, subject, priority) => {
    const id = `a_${Date.now()}`
    set(ref(db, `assignments/${id}`), { id, userId, ticketId, subject, priority, date: today(), status: 'pending', assignedAt: Date.now() })
    const u = users[userId]; notify(`🎫 #${ticketId} assigned to ${u?.name || 'agent'}`)
  }, [users, notify])

  const completeAssignment = useCallback(aid => {
    set(ref(db, `assignments/${aid}/status`), 'completed')
    set(ref(db, `assignments/${aid}/completedAt`), Date.now())
  }, [])

  const sendChat = useCallback((text) => {
    if (!currentUser || !text.trim()) return
    const id = `msg_${Date.now()}_${currentUser.id}`
    set(ref(db, `chatMessages/${id}`), { id, userId: currentUser.id, userName: currentUser.name, avatar: currentUser.avatar, text: text.trim(), timestamp: Date.now() })
  }, [currentUser])

  // Chat unread badge (hooks must be before early returns)
  const [lastSeenChat, setLastSeenChat] = useState(() => {
    try { return parseInt(localStorage.getItem('br_last_chat') || '0') } catch { return 0 }
  })
  const chatMsgsArr = objArr(chatMsgs)
  const prevChatCountRef = React.useRef(chatMsgsArr.length)

  useEffect(() => {
    if (!currentUser) return
    const newMsgs = chatMsgsArr.filter(m => m.userId !== currentUser.id)
    if (newMsgs.length > 0 && chatMsgsArr.length > prevChatCountRef.current) {
      const latest = newMsgs.sort((a, b) => b.timestamp - a.timestamp)[0]
      if (latest && latest.timestamp > lastSeenChat && tab !== 'chat') {
        playNotifSound()
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💬 ${latest.userName}`, { body: latest.text.slice(0, 80) })
        }
      }
    }
    prevChatCountRef.current = chatMsgsArr.length
  }, [chatMsgsArr.length])

  useEffect(() => {
    if (tab === 'chat' && chatMsgsArr.length > 0) {
      const latest = Math.max(...chatMsgsArr.map(m => m.timestamp))
      setLastSeenChat(latest)
      localStorage.setItem('br_last_chat', String(latest))
    }
  }, [tab, chatMsgsArr.length])

  if (loading) return <><style>{CSS}</style><div className="loading-screen"><div className="spinner" /><div>Connecting to BreakRoom...</div></div></>
  if (!currentUser) return <><style>{CSS}</style><LoginScreen users={users} onLogin={handleLogin} /></>

  const isAdmin = currentUser.role === 'admin'
  const usersArr = objArr(users)
  const historyArr = objArr(history).sort((a, b) => b.startTime - a.startTime)
  const myAssignments = objArr(assignments).filter(a => a.userId === currentUser.id && a.date === today()).sort((a, b) => a.assignedAt - b.assignedAt)
  const unreadChat = chatMsgsArr.filter(m => m.timestamp > lastSeenChat && currentUser && m.userId !== currentUser.id).length

  const tabs = [
    { id: 'home', label: '🏠 Home' },
    { id: 'my-break', label: 'Breaks' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chat', label: '💬 Chat', badge: unreadChat },
    { id: 'history', label: 'History' },
    ...(isAdmin ? [{ id: 'assign', label: 'Assign Tickets' }, { id: 'attendance', label: '🕐 Attendance' }, { id: 'categories', label: 'Types' }, { id: 'manage', label: 'Users' }] : []),
  ]

  return (
    <><style>{CSS}</style>
      <div className="app-layout">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-logo">☕ <span>Break</span>Room</div>
            <div className="topbar-tabs">{tabs.map(t => <button key={t.id} className={`topbar-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} style={{ position: 'relative' }}>{t.id === 'dashboard' && <span className="live-dot" />}{t.label}{t.badge > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{t.badge > 9 ? '9+' : t.badge}</span>}</button>)}</div>
          </div>
          <div className="topbar-right">
            <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center' }}><span className="sync-dot" />Live</div>
            <div className="user-info"><div className="name">{currentUser.name}</div><div className="role">{currentUser.role}</div></div>
            <div className="avatar">{currentUser.avatar}</div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <div className="mobile-tabs">{tabs.map(t => <button key={t.id} className={`topbar-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} style={{ position: 'relative' }}>{t.label}{t.badge > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge > 9 ? '9+' : t.badge}</span>}</button>)}</div>
        <main className="main">
          {tab === 'home' && <HomeTab user={currentUser} now={now} myClock={myClock} onClockIn={clockIn} onClockOut={clockOut} myBreak={myBreak} assignments={myAssignments} breakTypes={breakTypes} todayClockHistory={objArr(clockIns).filter(c => c.userId === currentUser.id && c.date === today()).sort((a, b) => b.clockIn - a.clockIn)} />}
          {tab === 'my-break' && <MyBreakTab breakTypes={breakTypes} activeBreak={myBreak} now={now} onStartBreak={startBreak} onEndBreak={endBreak} currentTicket={currentTickets[currentUser.id] || null} onSetTicket={setUserTicket} todayHistory={historyArr.filter(h => h.userId === currentUser.id && new Date(h.startTime).toISOString().split('T')[0] === today())} />}
          {tab === 'dashboard' && <DashboardTab breakTypes={breakTypes} users={usersArr} breaks={breaks} currentTickets={currentTickets} clockIns={clockIns} now={now} isAdmin={isAdmin} onForceEnd={forceEnd} />}
          {tab === 'chat' && <ChatTab chatMsgs={chatMsgs} onSend={sendChat} currentUser={currentUser} />}
          {tab === 'history' && <HistoryTab breakTypes={breakTypes} history={historyArr} isAdmin={isAdmin} currentUserId={currentUser.id} />}
          {tab === 'assign' && isAdmin && <AssignTab users={usersArr} assignments={assignments} onAssign={assignTicket} />}
          {tab === 'attendance' && isAdmin && <AttendanceTab users={usersArr} clockIns={clockIns} now={now} />}
          {tab === 'categories' && isAdmin && <ManageBTTab breakTypes={breakTypes} onAdd={addBT} onUpdate={updateBT} onRemove={removeBT} />}
          {tab === 'manage' && isAdmin && <ManageUsersTab users={usersArr} onAdd={addUser} onRemove={removeUser} onEdit={editUser} currentUserId={currentUser.id} />}
        </main>
        {notif && <div className="notification">{notif}</div>}
      </div>
    </>
  )
}

// ─── Login ───────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('')
  return (
    <div className="login-wrapper"><div className="login-card">
      <h1>☕ BreakRoom</h1><p className="subtitle">Team Break & Lunch Tracker · <span style={{ color: 'var(--success)', fontSize: 12 }}>● Real-time</span></p>
      {err && <div className="error-msg">{err}</div>}
      <form onSubmit={e => { e.preventDefault(); if (!onLogin(u, p)) setErr('Invalid credentials.') }}>
        <div className="fg"><label>Username</label><input value={u} onChange={e => { setU(e.target.value); setErr('') }} placeholder="Username" autoFocus /></div>
        <div className="fg"><label>Password</label><input type="password" value={p} onChange={e => { setP(e.target.value); setErr('') }} placeholder="Password" /></div>
        <button type="submit" className="btn btn-primary">Sign In</button>
      </form>
      <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Credentials</strong><br />Admin: rafa / admin123<br />Agent: agent1 / agent123
      </div>
    </div></div>
  )
}

// ─── Home ────────────────────────────────────────────────────────
function HomeTab({ user, now, myClock, onClockIn, onClockOut, myBreak, assignments, breakTypes, todayClockHistory }) {
  const time = new Date(now)
  const clockStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const worldClocks = [
    { city: 'El Salvador', tz: 'America/El_Salvador', flag: '🇸🇻' },
    { city: 'Buena Park', tz: 'America/Los_Angeles', flag: '🇺🇸' },
    { city: 'London', tz: 'Europe/London', flag: '🇬🇧' },
    { city: 'Madrid', tz: 'Europe/Madrid', flag: '🇪🇸' },
    { city: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺' },
  ]

  return (
    <>
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div className="avatar avatar-lg" style={{ margin: '0 auto 16px' }}>{user.avatar}</div>
        <div className="home-greeting">{greeting()}, {user.name} 👋</div>
        <div className="home-clock">{clockStr}</div>
        <div className="home-date">{dateStr}</div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!myClock ? (
            <button className="btn btn-success clockin-btn" onClick={onClockIn}>🟢 Clock In</button>
          ) : (
            <button className="btn btn-end clockin-btn" onClick={onClockOut}>🔴 Clock Out</button>
          )}
        </div>
        {myClock && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            Clocked in at <span className="mono" style={{ color: 'var(--text-secondary)' }}>{fmtTime(myClock.clockIn)}</span> · <span className="mono" style={{ color: 'var(--success)' }}>{fmt(now - myClock.clockIn)}</span>
          </div>
        )}
        {myBreak && (
          <div style={{ marginTop: 12, padding: '8px 16px', background: 'var(--warning-glow)', borderRadius: 'var(--radius-sm)', display: 'inline-block', fontSize: 13, color: 'var(--warning)' }}>
            {(breakTypes[myBreak.type]?.icon || '⏸️')} Currently on {breakTypes[myBreak.type]?.label || 'break'} · {fmt(now - myBreak.startTime)}
          </div>
        )}
      </div>

      {/* World Clocks */}
      <div className="card">
        <div className="card-header"><div className="card-title">🌍 World Clocks</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {worldClocks.map(wc => {
            const t = new Date(now).toLocaleTimeString('en-US', { timeZone: wc.tz, hour: '2-digit', minute: '2-digit', hour12: true })
            const d = new Date(now).toLocaleDateString('en-US', { timeZone: wc.tz, weekday: 'short' })
            return (
              <div key={wc.tz} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 20 }}>{wc.flag}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{wc.city}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Clock In/Out History */}
      {todayClockHistory.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">🕐 My Clock History Today</div></div>
          <table className="history-table">
            <thead><tr><th>Clock In</th><th>Clock Out</th><th>Duration</th></tr></thead>
            <tbody>{todayClockHistory.map((c, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: 13, color: 'var(--success)' }}>{fmtTime(c.clockIn)}</td>
                <td className="mono" style={{ fontSize: 13, color: c.clockOut ? 'var(--danger)' : 'var(--text-muted)' }}>{c.clockOut ? fmtTime(c.clockOut) : '— Active'}</td>
                <td className="mono" style={{ fontSize: 13 }}>{c.clockOut ? fmt(c.clockOut - c.clockIn) : fmt(now - c.clockIn)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">🎫 My Tickets Today</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{assignments.filter(a => a.status === 'pending').length} pending</div></div>
          {assignments.map(a => (
            <div key={a.id} className="ticket-card" style={a.status === 'completed' ? { opacity: 0.5 } : {}}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ticket-id">#{a.ticketId}</span>
                  <span className={`ticket-priority priority-${a.priority || 'normal'}`}>{a.priority || 'normal'}</span>
                  {a.status === 'completed' && <span style={{ fontSize: 11, color: 'var(--success)' }}>✅ Done</span>}
                </div>
                <div className="ticket-subject">{a.subject || 'No subject'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WeatherWidget />
      <MiniCalendar />
    </>
  )
}

// ─── Weather Widget ──────────────────────────────────────────────
function WeatherWidget() {
  const [data, setData] = useState(null)
  const [loc, setLoc] = useState('Loading...')
  useEffect(() => {
    const fetchW = (lat, lon) => {
      // Reverse geocode for location name
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto&forecast_days=1`)
        .then(r => r.json()).then(d => {
          if (d.current) setData(d)
          if (d.timezone) setLoc(d.timezone.split('/').pop().replace(/_/g, ' '))
        }).catch(() => {})
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => fetchW(p.coords.latitude, p.coords.longitude),
        () => fetchW(13.69, -89.19)
      )
    } else fetchW(13.69, -89.19)
  }, [])

  if (!data) return null

  const wmo = c => { if (c === 0) return '☀️'; if (c <= 2) return '⛅'; if (c <= 3) return '☁️'; if (c <= 49) return '🌫️'; if (c <= 59) return '🌦️'; if (c <= 69) return '🌧️'; if (c <= 79) return '❄️'; return '⛈️' }
  const wmoTxt = c => { if (c === 0) return 'Clear'; if (c <= 2) return 'Partly Cloudy'; if (c <= 3) return 'Overcast'; if (c <= 49) return 'Foggy'; if (c <= 59) return 'Drizzle'; if (c <= 69) return 'Rain'; if (c <= 79) return 'Snow'; return 'Storm' }

  const curHour = new Date().getHours()
  const hourly = (data.hourly?.time || []).slice(curHour, curHour + 6).map((t, i) => ({
    hour: new Date(t).getHours(),
    temp: Math.round(data.hourly.temperature_2m[curHour + i]),
    icon: wmo(data.hourly.weather_code[curHour + i])
  }))

  const hi = data.daily ? Math.round(data.daily.temperature_2m_max[0]) : '--'
  const lo = data.daily ? Math.round(data.daily.temperature_2m_min[0]) : '--'

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2744 100%)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{loc}</div>
          <div style={{ fontSize: 52, fontWeight: 300, color: 'white', lineHeight: 1, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{Math.round(data.current.temperature_2m)}°</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36 }}>{wmo(data.current.weather_code)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{wmoTxt(data.current.weather_code)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>H:{hi}° L:{lo}°</div>
        </div>
      </div>
      {hourly.length > 0 && (
        <div style={{ display: 'flex', gap: 0, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between' }}>
          {hourly.map((h, i) => (
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{i === 0 ? 'Now' : `${String(h.hour).padStart(2, '0')}:00`}</div>
              <div style={{ fontSize: 20, margin: '6px 0' }}>{h.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{h.temp}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Chat Tab ────────────────────────────────────────────────────
function ChatTab({ chatMsgs, onSend, currentUser }) {
  const [text, setText] = useState('')
  const msgsEndRef = React.useRef(null)
  const msgs = objArr(chatMsgs).sort((a, b) => a.timestamp - b.timestamp)

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  const handleSend = () => { if (!text.trim()) return; onSend(text); setText('') }

  let lastDate = ''
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="card-title">💬 Team Chat</div>
        <div className="card-subtitle">{msgs.length} messages · Real-time</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {msgs.length === 0 && <div className="empty-state"><div className="icon">💬</div><div className="msg">No messages yet. Say hi!</div></div>}
        {msgs.map((m, i) => {
          const msgDate = new Date(m.timestamp).toLocaleDateString()
          let showDate = false
          if (msgDate !== lastDate) { showDate = true; lastDate = msgDate }
          const isMe = m.userId === currentUser.id
          return (
            <React.Fragment key={m.id || i}>
              {showDate && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '12px 0 8px', fontWeight: 600 }}>{msgDate === new Date().toLocaleDateString() ? 'Today' : msgDate}</div>}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', maxWidth: '75%' }}>
                  <div className="avatar avatar-sm" style={{ background: isMe ? 'var(--accent)' : 'var(--info)', flexShrink: 0, fontSize: m.avatar?.length > 2 ? 14 : 11 }}>{m.avatar || '?'}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isMe ? 'var(--accent)' : 'var(--info)', textAlign: isMe ? 'right' : 'left', marginBottom: 2 }}>{isMe ? 'You' : m.userName}</div>
                    <div style={{ padding: '10px 14px', background: isMe ? 'var(--accent)' : 'var(--bg-elevated)', color: isMe ? 'white' : 'var(--text-primary)', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: isMe ? 'right' : 'left', marginTop: 2 }}>{fmtTime(m.timestamp)}</div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        })}
        <div ref={msgsEndRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div className="chat-input-row">
          <input className="chat-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="Type a message..." autoComplete="off" />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 20px' }} onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  )
}

// ─── Mini Calendar ───────────────────────────────────────────────
function MiniCalendar() {
  const [viewDate, setViewDate] = useState(new Date())
  const yr = viewDate.getFullYear(), mo = viewDate.getMonth()
  const firstDay = new Date(yr, mo, 1).getDay()
  const daysInMonth = new Date(yr, mo + 1, 0).getDate()
  const todayStr = today()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ day: new Date(yr, mo, -firstDay + i + 1).getDate(), other: true })
  for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, other: false, isToday: `${yr}-${String(mo + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` === todayStr })
  const remaining = 7 - (days.length % 7); if (remaining < 7) for (let i = 1; i <= remaining; i++) days.push({ day: i, other: true })

  const prev = () => setViewDate(new Date(yr, mo - 1, 1))
  const next = () => setViewDate(new Date(yr, mo + 1, 1))

  return (
    <div className="card">
      <div className="card-header">
        <button className="btn btn-ghost btn-sm" onClick={prev}>◀</button>
        <div className="card-title">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button className="btn btn-ghost btn-sm" onClick={next}>▶</button>
      </div>
      <div className="cal-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="cal-header">{d}</div>)}
        {days.map((d, i) => <div key={i} className={`cal-day ${d.other ? 'other-month' : ''} ${d.isToday ? 'today' : ''}`}>{d.day}</div>)}
      </div>
    </div>
  )
}

// ─── My Break ────────────────────────────────────────────────────
function MyBreakTab({ breakTypes, activeBreak, now, onStartBreak, onEndBreak, currentTicket, onSetTicket, todayHistory }) {
  const [pendingType, setPT] = useState(null), [ticketNum, setTN] = useState(''), [returnPrompt, setRP] = useState(null), [newTI, setNTI] = useState('')

  const handleEnd = () => { const bt = breakTypes[activeBreak?.type]; if (!bt?.requiresTicket && currentTicket) { onEndBreak(); setRP({ prev: currentTicket }) } else onEndBreak() }
  const retSame = () => { const k = Object.keys(breakTypes).find(k => breakTypes[k].requiresTicket); if (k) onStartBreak(k, returnPrompt.prev); setRP(null) }
  const retNew = () => { if (!newTI.trim()) return; onSetTicket(newTI.trim()); const k = Object.keys(breakTypes).find(k => breakTypes[k].requiresTicket); if (k) onStartBreak(k, newTI.trim()); setRP(null); setNTI('') }
  const retNone = () => { onSetTicket(null); setRP(null) }

  if (returnPrompt) return (
    <div className="card"><div style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Welcome back!</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>You were on ticket <span style={{ color: 'var(--info)', fontWeight: 600 }} className="mono">#{returnPrompt.prev}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
        <button className="btn btn-primary" style={{ padding: 14, fontSize: 15 }} onClick={retSame}>🎫 Continue #{returnPrompt.prev}</button>
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'left' }}>Switch ticket:</div>
          <div style={{ display: 'flex', gap: 8 }}><input value={newTI} onChange={e => setNTI(e.target.value)} onKeyDown={e => e.key === 'Enter' && retNew()} placeholder="New ticket #" className="mono" style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} /><button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={retNew}>Start</button></div>
        </div>
        <button className="btn btn-ghost" onClick={retNone}>No ticket</button>
      </div>
    </div></div>
  )

  if (activeBreak) {
    const el = now - activeBreak.startTime, info = breakTypes[activeBreak.type] || { label: '?', icon: '❓', maxMinutes: 30, color: '#888' }
    const mx = info.maxMinutes * 60000, pct = Math.min(el / mx * 100, 100), ot = el > mx, isTk = info.requiresTicket
    return (
      <div className="card"><div className="timer-display">
        <div className="timer-type"><span>{info.icon}</span><span>{info.label}</span></div>
        {activeBreak.ticketNumber && <div style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'var(--info-glow)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, color: 'var(--info)' }}>🎫 #{activeBreak.ticketNumber}</div>}
        <div className={`timer-value mono ${isTk ? '' : ot ? 'status-overtime' : 'status-on-break'}`} style={isTk ? { color: 'var(--info)' } : {}}>{fmt(el)}</div>
        <div className="timer-started">Started {fmtTime(activeBreak.startTime)}{!isTk && ` · Max ${info.maxMinutes}m`}{!isTk && ot && <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · ⚠️ OVERTIME</span>}</div>
        {!isTk && <div className="timer-progress"><div className="timer-progress-bar" style={{ width: `${pct}%`, backgroundColor: ot ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : info.color }} /></div>}
        <button className="btn btn-end" onClick={handleEnd}>{isTk ? '✅ Done' : '⏹ End Break'}</button>
      </div></div>
    )
  }

  const clickBreak = k => { const bt = breakTypes[k]; bt.requiresTicket ? (setPT(k), setTN(currentTicket || '')) : onStartBreak(k) }
  const submitTk = () => { if (!ticketNum.trim()) return; onStartBreak(pendingType, ticketNum.trim()); setPT(null); setTN('') }

  return (
    <>
      {currentTicket && <div style={{ marginBottom: 16, padding: '12px 20px', background: 'var(--info-glow)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: 14, color: 'var(--info)' }}><strong>🎫 Current:</strong> <span className="mono">#{currentTicket}</span></div><button className="btn btn-ghost btn-sm" onClick={() => onSetTicket(null)}>Clear</button></div>}
      <div className="card">
        <div className="card-header"><div><div className="card-title">Start a Break</div><div className="card-subtitle">Select type</div></div><span className="status-badge status-available"><span className="status-dot" /> Available</span></div>
        <div className="break-grid">{Object.entries(breakTypes).map(([k, bt]) => <button key={k} className="btn btn-break" onClick={() => clickBreak(k)} style={pendingType === k ? { borderColor: 'var(--info)', background: 'var(--info-glow)' } : {}}><span className="break-icon">{bt.icon}</span> <strong>{bt.label}</strong><span className="break-max">{bt.requiresTicket ? ' · Ticket #' : ` · ${bt.maxMinutes}m`}</span></button>)}</div>
        {pendingType && <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--info)' }}><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--info)' }}>🎫 Ticket Number</div><div style={{ display: 'flex', gap: 8 }}><input value={ticketNum} onChange={e => setTN(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitTk(); if (e.key === 'Escape') setPT(null) }} placeholder="e.g. 123456" autoFocus className="mono" style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }} /><button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={submitTk}>Start</button><button className="btn btn-ghost" onClick={() => setPT(null)}>Cancel</button></div></div>}
      </div>
      {todayHistory.length > 0 && <div className="card"><div className="card-header"><div className="card-title">Today</div></div><table className="history-table"><thead><tr><th>Type</th><th>Ticket</th><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>{todayHistory.map((h, i) => { const info = breakTypes[h.type] || { label: h.type, icon: '❓', maxMinutes: 30 }; const isOT = !info.requiresTicket && h.duration > info.maxMinutes * 60000; return <tr key={i}><td><span className="break-tag">{info.icon} {info.label}</span></td><td className="mono" style={{ fontSize: 13, color: h.ticketNumber ? 'var(--info)' : 'var(--text-muted)' }}>{h.ticketNumber ? `#${h.ticketNumber}` : '—'}</td><td>{fmtTime(h.startTime)}</td><td>{fmtTime(h.endTime)}</td><td className={isOT ? 'overtime-tag' : ''}>{fmt(h.duration)}{isOT && ' ⚠️'}</td></tr> })}</tbody></table></div>}
    </>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────
function DashboardTab({ breakTypes, users, breaks, currentTickets, clockIns, now, isAdmin, onForceEnd }) {
  const active = Object.values(breaks).filter(b => b.endTime === 0)
  const todayCIs = Object.values(clockIns).filter(c => c.date === today())
  const clockedIn = todayCIs.filter(c => c.clockOut === 0)
  const working = active.filter(b => breakTypes[b.type]?.requiresTicket).length
  const onBreak = active.length - working
  const ot = active.filter(b => { const bt = breakTypes[b.type] || { maxMinutes: 30 }; return !bt.requiresTicket && (now - b.startTime) > bt.maxMinutes * 60000 }).length

  return (
    <>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{users.length}</div><div className="stat-label">Total</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{clockedIn.length}</div><div className="stat-label">Clocked In</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--info)' }}>{working}</div><div className="stat-label">Working</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{onBreak}</div><div className="stat-label">On Break</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{ot}</div><div className="stat-label">Overtime</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title"><span className="live-dot" />Live Status</div></div>
        <div className="dashboard-grid">{users.map(user => {
          const ab = active.find(b => b.userId === user.id)
          const ci = clockedIn.find(c => c.userId === user.id)
          const tk = currentTickets[user.id]
          if (ab) {
            const el = now - ab.startTime, info = breakTypes[ab.type] || { label: '?', icon: '❓', maxMinutes: 30, color: '#888' }
            const mx = info.maxMinutes * 60000, pct = Math.min(el / mx * 100, 100), isOt = !info.requiresTicket && el > mx, isTk = info.requiresTicket
            return (
              <div key={user.id} className="agent-card" style={{ borderColor: isOt ? 'rgba(239,68,68,0.4)' : isTk ? 'rgba(59,130,246,0.3)' : 'rgba(234,179,8,0.3)' }}>
                <div className="agent-card-header"><div className="avatar avatar-sm" style={{ background: info.color }}>{user.avatar}</div><div><div className="agent-name">{user.name}</div><span className={`status-badge ${isOt ? 'status-overtime-badge' : isTk ? 'status-working-badge' : 'status-on-break-badge'}`}><span className="status-dot" />{isOt ? 'Overtime' : isTk ? 'Working' : 'On Break'}</span></div></div>
                <div className="agent-break-type">{info.icon} {info.label}{!isTk && ` · ${info.maxMinutes}m`}</div>
                {ab.ticketNumber && <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', marginTop: 4 }}>🎫 #{ab.ticketNumber}</div>}
                <div className={`agent-timer ${isTk ? '' : isOt ? 'status-overtime' : 'status-on-break'}`} style={isTk ? { color: 'var(--info)' } : {}}>{fmt(el)}</div>
                {!isTk && <div className="agent-progress"><div className="agent-progress-bar" style={{ width: `${pct}%`, backgroundColor: isOt ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : info.color }} /></div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Since {fmtTime(ab.startTime)}</div>
                {isAdmin && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={() => onForceEnd(ab.id)}>⏹ End</button>}
              </div>
            )
          }
          return (
            <div key={user.id} className="agent-card">
              <div className="agent-card-header"><div className="avatar avatar-sm">{user.avatar}</div><div><div className="agent-name">{user.name}</div><span className={`status-badge ${ci ? 'status-available' : 'status-offline-badge'}`}><span className="status-dot" />{ci ? 'Available' : 'Offline'}</span></div></div>
              {tk && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Last: #{tk}</div>}
              {ci && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>In since {fmtTime(ci.clockIn)}</div>}
            </div>
          )
        })}</div>
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
      <div className="card-header"><div className="card-title">History</div><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}><button className="btn btn-ghost btn-sm" style={filter === 'all' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter('all')}>All</button>{Object.entries(breakTypes).map(([k, bt]) => <button key={k} className="btn btn-ghost btn-sm" style={filter === k ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter(k)}>{bt.icon}</button>)}</div></div>
      {filtered.length === 0 ? <div className="empty-state"><div className="icon">📋</div><div className="msg">No history</div></div> :
        <table className="history-table"><thead><tr>{isAdmin && <th>Agent</th>}<th>Type</th><th>Ticket</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>{filtered.slice(0, 50).map((h, i) => { const info = breakTypes[h.type] || { label: h.type, icon: '❓', maxMinutes: 30 }; const isOT = !info.requiresTicket && h.duration > info.maxMinutes * 60000; return <tr key={i}>{isAdmin && <td style={{ fontWeight: 500 }}>{h.userName}</td>}<td><span className="break-tag">{info.icon} {info.label}</span></td><td className="mono" style={{ fontSize: 13, color: h.ticketNumber ? 'var(--info)' : 'var(--text-muted)' }}>{h.ticketNumber ? `#${h.ticketNumber}` : '—'}</td><td style={{ color: 'var(--text-secondary)' }}>{new Date(h.startTime).toLocaleDateString()}</td><td className="mono" style={{ fontSize: 13 }}>{fmtTime(h.startTime)}</td><td className="mono" style={{ fontSize: 13 }}>{fmtTime(h.endTime)}</td><td className={`mono ${isOT ? 'overtime-tag' : ''}`} style={{ fontSize: 13 }}>{fmt(h.duration)}{isOT && ' ⚠️'}</td></tr> })}</tbody></table>
      }
    </div>
  )
}

// ─── Assign Tickets (Admin) ──────────────────────────────────────
function AssignTab({ users, assignments, onAssign }) {
  const [userId, setUID] = useState(''), [ticketId, setTID] = useState(''), [subject, setSub] = useState(''), [priority, setPri] = useState('normal')
  const agents = users.filter(u => u.role === 'agent')
  const todayAssignments = objArr(assignments).filter(a => a.date === today()).sort((a, b) => b.assignedAt - a.assignedAt)

  const handleAssign = () => {
    if (!userId || !ticketId.trim()) return
    onAssign(userId, ticketId.trim(), subject.trim(), priority)
    setTID(''); setSub(''); setPri('normal')
  }

  return (
    <>
      <div className="card">
        <div className="card-header"><div className="card-title">🎫 Assign Ticket</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Agent</label><select value={userId} onChange={e => setUID(e.target.value)}><option value="">Select agent...</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="fg"><label>Ticket #</label><input value={ticketId} onChange={e => setTID(e.target.value)} placeholder="e.g. 123456" /></div>
          <div className="fg"><label>Subject</label><input value={subject} onChange={e => setSub(e.target.value)} placeholder="Brief description..." /></div>
          <div className="fg"><label>Priority</label><select value={priority} onChange={e => setPri(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="medium">Medium</option><option value="high">High</option></select></div>
        </div>
        <button className="btn btn-info" style={{ width: '100%', marginTop: 8 }} onClick={handleAssign}>Assign Ticket</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Today's Assignments</div><div className="card-subtitle">{todayAssignments.length} tickets assigned</div></div>
        {todayAssignments.length === 0 ? <div className="empty-state"><div className="icon">🎫</div><div className="msg">No tickets assigned today</div></div> :
          todayAssignments.map(a => {
            const agent = users.find(u => u.id === a.userId)
            return (
              <div key={a.id} className="ticket-card" style={a.status === 'completed' ? { opacity: 0.5 } : {}}>
                <div className="avatar avatar-sm">{agent?.avatar || '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ticket-id">#{a.ticketId}</span>
                    <span className={`ticket-priority priority-${a.priority}`}>{a.priority}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {agent?.name}</span>
                    {a.status === 'completed' && <span style={{ fontSize: 11, color: 'var(--success)' }}>✅</span>}
                  </div>
                  <div className="ticket-subject">{a.subject || 'No subject'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Assigned {fmtTime(a.assignedAt)}</div>
                </div>
              </div>
            )
          })
        }
      </div>
    </>
  )
}

// ─── Manage Break Types ──────────────────────────────────────────
function ManageBTTab({ breakTypes, onAdd, onUpdate, onRemove }) {
  const [show, setShow] = useState(false), [ek, setEK] = useState(null)
  const [form, setF] = useState({ label: '', icon: '☕', maxMinutes: 15, color: '#3498db', requiresTicket: false })
  const [cd, setCD] = useState(null)
  const openAdd = () => { setEK(null); setF({ label: '', icon: '☕', maxMinutes: 15, color: '#3498db', requiresTicket: false }); setShow(true) }
  const openEdit = k => { const bt = breakTypes[k]; setEK(k); setF({ label: bt.label, icon: bt.icon, maxMinutes: bt.maxMinutes, color: bt.color, requiresTicket: bt.requiresTicket || false }); setShow(true) }
  const save = () => { if (!form.label.trim()) return; ek ? onUpdate(ek, { ...form, label: form.label.trim() }) : onAdd(form.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now(), { ...form, label: form.label.trim() }); setShow(false) }
  const del = k => { if (cd === k) { onRemove(k); setCD(null) } else { setCD(k); setTimeout(() => setCD(null), 3000) } }
  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">Break Types</div><div className="card-subtitle">{Object.keys(breakTypes).length} types</div></div><button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={openAdd}>+ New</button></div>
        {Object.entries(breakTypes).map(([k, bt]) => <div key={k} className="category-row"><div className="category-icon" style={{ background: bt.color + '22' }}>{bt.icon}</div><div className="category-info"><div className="name">{bt.label}{bt.requiresTicket && <span style={{ fontSize: 11, color: 'var(--info)', marginLeft: 8 }}>🎫</span>}</div><div className="meta">Max {bt.maxMinutes}m</div></div><div className="category-actions"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(k)}>✏️</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(k)}>{cd === k ? '⚠️?' : '🗑️'}</button></div></div>)}
      </div>
      {show && <div className="modal-overlay" onClick={() => setShow(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{ek ? 'Edit' : 'New'} Break Type</h2>
        <div className="fg"><label>Name</label><input value={form.label} onChange={e => setF(f => ({ ...f, label: e.target.value }))} placeholder="Training, Coaching..." autoFocus /></div>
        <div className="fg"><label>Max Minutes</label><input type="number" min="1" max="480" value={form.maxMinutes} onChange={e => setF(f => ({ ...f, maxMinutes: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setF(f => ({ ...f, requiresTicket: !f.requiresTicket }))}><div style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: form.requiresTicket ? 'var(--info)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>{form.requiresTicket && '✓'}</div><div><div style={{ fontSize: 13, fontWeight: 600 }}>Requires ticket #</div></div></div>
        <div className="fg"><label>Icon</label><div className="icon-picker">{ICON_OPTIONS.map(ic => <button key={ic} className={`icon-option ${form.icon === ic ? 'selected' : ''}`} onClick={() => setF(f => ({ ...f, icon: ic }))}>{ic}</button>)}</div></div>
        <div className="fg"><label>Color</label><div className="color-picker">{COLOR_OPTIONS.map(c => <button key={c} className={`color-option ${form.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setF(f => ({ ...f, color: c }))} />)}</div></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>{ek ? 'Save' : 'Create'}</button></div>
      </div></div>}
    </>
  )
}

// ─── Attendance History (Admin) ──────────────────────────────────
function AttendanceTab({ users, clockIns, now }) {
  const [dateFilter, setDateFilter] = useState(today())
  const allCIs = objArr(clockIns).filter(c => c.date === dateFilter).sort((a, b) => a.clockIn - b.clockIn)

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🕐 Attendance Log</div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13 }} />
      </div>
      {allCIs.length === 0 ? <div className="empty-state"><div className="icon">🕐</div><div className="msg">No clock-ins for this date</div></div> :
        <table className="history-table">
          <thead><tr><th>Agent</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th>Status</th></tr></thead>
          <tbody>{allCIs.map((c, i) => {
            const user = users.find(u => u.id === c.userId)
            const dur = c.clockOut ? c.clockOut - c.clockIn : now - c.clockIn
            return (
              <tr key={i}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="avatar avatar-sm" style={{ fontSize: user?.avatar?.length > 2 ? 14 : 11 }}>{user?.avatar || '?'}</div><span style={{ fontWeight: 500 }}>{c.userName}</span></td>
                <td className="mono" style={{ fontSize: 13, color: 'var(--success)' }}>{fmtTime(c.clockIn)}</td>
                <td className="mono" style={{ fontSize: 13, color: c.clockOut ? 'var(--danger)' : 'var(--text-muted)' }}>{c.clockOut ? fmtTime(c.clockOut) : '— Active'}</td>
                <td className="mono" style={{ fontSize: 13 }}>{fmt(dur)}</td>
                <td>{c.clockOut ? <span className="status-badge status-offline-badge">Done</span> : <span className="status-badge status-available">Active</span>}</td>
              </tr>
            )
          })}</tbody>
        </table>
      }
    </div>
  )
}

// ─── Manage Users ────────────────────────────────────────────────
const AVATAR_EMOJIS = ['😀','😎','🤓','🧑‍💻','👨‍💼','👩‍💼','🦊','🐱','🐶','🦁','🐼','🦄','🐸','🌟','⚡','🔥','💎','🎯','🚀','🎮','🎸','🏆','🌈','🍕','☕','🎭','🤖','👾','🧑‍🚀','🦸']

function ManageUsersTab({ users, onAdd, onRemove, onEdit, currentUserId }) {
  const [n, setN] = useState(''), [u, setU] = useState(''), [p, setP] = useState('')
  const [editing, setEditing] = useState(null)
  const [editForm, setEF] = useState({ name: '', username: '', password: '', avatar: '' })
  const [showAvatarPicker, setSAP] = useState(false)

  const add = () => { if (!n.trim() || !u.trim() || !p.trim()) return; onAdd(n.trim(), u.trim(), p.trim()); setN(''); setU(''); setP('') }
  const openEdit = (user) => { setEditing(user); setEF({ name: user.name, username: user.username, password: '', avatar: user.avatar || '' }); setSAP(false) }
  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.username.trim()) return
    const fields = { name: editForm.name.trim(), username: editForm.username.trim() }
    if (editForm.avatar) fields.avatar = editForm.avatar
    else fields.avatar = editForm.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    if (editForm.password.trim()) fields.password = editForm.password.trim()
    onEdit(editing.id, fields)
    setEditing(null)
  }

  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">Users</div><div className="card-subtitle">{users.length} registered</div></div></div>
        {users.map(x => (
          <div key={x.id} className="user-row">
            <div className="avatar avatar-sm" style={{ fontSize: x.avatar?.length > 2 ? 18 : 11 }}>{x.avatar}</div>
            <div className="user-row-info">
              <div className="name">{x.name}</div>
              <div className="meta">@{x.username} · {x.role}{x.id === currentUserId && ' (you)'}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(x)}>✏️ Edit</button>
            {x.id !== currentUserId && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onRemove(x.id)}>Remove</button>}
          </div>
        ))}
        <div className="add-user-form">
          <input placeholder="Name" value={n} onChange={e => setN(e.target.value)} />
          <input placeholder="Username" value={u} onChange={e => setU(e.target.value)} />
          <input placeholder="Password" type="password" value={p} onChange={e => setP(e.target.value)} />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={add}>+ Add</button>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit User</h2>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 8px', fontSize: editForm.avatar?.length > 2 ? 28 : 22, cursor: 'pointer', border: '2px dashed var(--border)' }} onClick={() => setSAP(!showAvatarPicker)}>{editForm.avatar || '?'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSAP(!showAvatarPicker)}>Click to change avatar</div>
              {showAvatarPicker && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {AVATAR_EMOJIS.map(e => (
                    <button key={e} onClick={() => { setEF(f => ({ ...f, avatar: e })); setSAP(false) }} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: editForm.avatar === e ? '2px solid var(--accent)' : '1px solid var(--border)', background: editForm.avatar === e ? 'var(--accent-glow)' : 'var(--bg-surface)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
                  ))}
                  <button onClick={() => { setEF(f => ({ ...f, avatar: f.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) })); setSAP(false) }} style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>Use Initials</button>
                </div>
              )}
            </div>
            <div className="fg"><label>Name</label>
              <input value={editForm.name} onChange={e => setEF(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
            <div className="fg"><label>Username</label>
              <input value={editForm.username} onChange={e => setEF(f => ({ ...f, username: e.target.value }))} /></div>
            <div className="fg"><label>New Password <span style={{ fontWeight: 400, textTransform: 'none' }}>(leave blank to keep current)</span></label>
              <input type="password" value={editForm.password} onChange={e => setEF(f => ({ ...f, password: e.target.value }))} placeholder="Enter new password..." /></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
