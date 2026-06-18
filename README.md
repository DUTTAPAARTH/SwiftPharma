# SwiftPharma — Fast & Reliable Medicine Delivery

🏥 A modern, full-stack online pharmacy delivery platform inspired by Blinkit, designed for the Indian market with a focus on fast delivery, verified products, and user privacy.

**Live Demo**: [swift-pharma-client.vercel.app](https://swift-pharma-client.vercel.app) &nbsp;|&nbsp; **API**: [swiftpharma.onrender.com](https://swiftpharma.onrender.com/health)

---

## What is SwiftPharma?

SwiftPharma is a full-stack online pharmacy platform with AI-powered prescription scanning, real-time delivery tracking, emergency SOS, and a caregiver dashboard. Built with React + Node.js + MongoDB Atlas.

---

## Features

| Category | Features |
|---|---|
| **Shopping** | Browse by category, product search, cart, checkout |
| **Prescriptions** | AI scan & extract medicines (Groq + Gemini), upload, admin review |
| **Delivery** | Real-time GPS tracking, delivery agent dashboard |
| **Emergency** | SOS with relay tracking, emergency medicine dispatch |
| **Health** | Dose reminders, medication vault, health companion AI chat |
| **Caregiver** | Invite caregivers, manage patient medications remotely |
| **Admin** | Products, orders, prescriptions, users, analytics |
| **Auth** | JWT, role-based access (user / admin / delivery) |

---

## Tech Stack

**Frontend** — React 19, Vite 7, Tailwind CSS, React Router, Axios, Leaflet maps

**Backend** — Node.js, Express 5, MongoDB Atlas (Mongoose), Socket.io, JWT

**AI** — Groq (`llama-3.3-70b-versatile`) as primary, Gemini as fallback

**Storage** — Cloudinary (images & prescriptions)

**Deployment** — Vercel (frontend) + Render (backend)

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas cluster
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Cloudinary account (free)

### Local Setup

```bash
# Clone
git clone https://github.com/DUTTAPAARTH/SwiftPharma.git
cd SwiftPharma

# Install all dependencies (root + client + server)
npm install

# Configure backend environment
cp server/.env.example server/.env
# Fill in MONGO_URI, JWT_SECRET, GROQ_API_KEY, CLOUDINARY_* in server/.env

# Start both frontend and backend
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:5000`.

### Environment Variables

**`server/.env`** (required):

```env
MONGO_URI=          # MongoDB Atlas connection string
JWT_SECRET=         # Any random secret string
GROQ_API_KEY=       # From console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=     # Optional fallback
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
```

**`client/.env`** (only needed in production):

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Project Structure

```
SwiftPharma/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── context/         # Auth, Cart, Theme, Prescription contexts
│   │   ├── services/        # API call functions (axios)
│   │   ├── hooks/           # Custom React hooks
│   │   └── styles/          # Tailwind globals
│   ├── public/              # Static assets
│   └── vercel.json          # SPA routing config
│
├── server/                  # Express backend
│   ├── src/
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express routers
│   │   ├── middleware/      # Auth, error, upload
│   │   ├── services/        # Business logic, schedulers
│   │   └── config/          # DB, Cloudinary, MCP
│   └── index.js             # Entry point
│
└── package.json             # npm workspaces root
```

---

## Deployment

### Backend (Render)

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | *(empty)* |
| Start Command | `node index.js` |
| Health Check | `/health` |

Add all `server/.env` variables in Render -> Environment tab.

### Frontend (Vercel)

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add `VITE_API_URL` = your Render URL in Vercel -> Environment Variables.

### After both are deployed

1. Set `CLIENT_URL` = your Vercel URL on Render and redeploy
2. Whitelist `0.0.0.0/0` on MongoDB Atlas Network Access

---

## API Health Check

```
GET https://swiftpharma.onrender.com/health
-> { "status": "ok" }
```

---

## License

MIT
