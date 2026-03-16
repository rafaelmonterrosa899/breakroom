# ☕ BreakRoom — Team Break & Lunch Tracker

A real-time break and lunch tracking application for call center and operations teams. Monitor your team's break status, track overtime, and manage agents — all from a clean, modern dashboard.

![BreakRoom Screenshot](https://img.shields.io/badge/Status-Production_Ready-green?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)

## Features

### 🔐 User Authentication
- Login system with username/password
- Role-based access (Admin & Agent)
- Session persistence via localStorage

### ⏱️ Real-Time Break Tracking
- **4 break types**: Lunch (60m), 15-min Break, 10-min Break, Personal (30m)
- Live countdown timers with progress bars
- Overtime detection with visual alerts (pulsing red)
- One-click start/end breaks

### 📊 Live Dashboard
- Real-time overview of all agents' status
- See who's on break, how long they've been, and if they're overtime
- Stats row: Total agents, Available, On Break, Overtime
- Admin can force-end anyone's break

### 📋 Break History
- Filterable history log by break type
- Duration tracking with overtime flagging
- Admin sees all agents; agents see only their own
- Date, start time, end time, and duration columns

### 👥 User Management (Admin)
- Add new agents on the fly
- Remove agents
- View all registered users

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/breakroom.git
cd breakroom

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder — ready to deploy anywhere.

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `george` | `admin123` |
| Agent | `agent1` | `agent123` |
| Agent | `agent2` | `agent123` |
| Agent | `agent3` | `agent123` |
| Agent | `agent4` | `agent123` |

## Tech Stack

- **React 18** — UI framework
- **Vite 6** — Build tool & dev server
- **localStorage** — Data persistence (no backend required)
- **Pure CSS** — Custom design system, no UI library dependencies

## Data Storage

All data is stored in the browser's `localStorage`:
- `br_users` — Registered users
- `br_breaks` — Active breaks
- `br_history` — Completed break history
- `br_session` — Current logged-in user

> **Note**: Since this uses localStorage, each browser instance has its own data. For real multi-user support, you'd need a backend (Firebase, Supabase, etc.)

## Deployment Options

### GitHub Pages
```bash
npm run build
# Push the dist/ folder to gh-pages branch
```

### Vercel / Netlify
Connect your GitHub repo and deploy automatically. Both platforms auto-detect Vite projects.

### Docker
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Customization

### Adding Break Types
Edit the `BREAK_TYPES` object in `src/App.jsx`:

```js
const BREAK_TYPES = {
  lunch: { label: 'Lunch', icon: '🍽️', maxMinutes: 60, color: '#e67e22' },
  break15: { label: '15 Min Break', icon: '☕', maxMinutes: 15, color: '#3498db' },
  // Add your custom break type:
  training: { label: 'Training', icon: '📚', maxMinutes: 45, color: '#8b5cf6' },
}
```

### Changing Default Users
Edit the `DEFAULT_USERS` array in `src/App.jsx` with your team's info.

## License

MIT — Use it however you want.

---

Built with ☕ and React
