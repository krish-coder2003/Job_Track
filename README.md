# JobTrack 🚀
### Modern Job Portal & Applicant Tracking System (ATS)

JobTrack is a full-stack MERN application engineered for recruitment workflows. It enables job seekers to discover career opportunities and provides hiring teams with an intuitive Applicant Tracking System to evaluate candidates across custom hiring stages.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast, responsive single-page application |
| **Language** | JavaScript (ESM) | Modern ECMAScript module standard |
| **Styling** | Tailwind CSS v4 | Utility-first, responsive, and glassmorphic UI |
| **Routing** | React Router DOM v7 | Client-side declarative route management |
| **HTTP Client**| Axios | Promise-based HTTP client with interceptors |
| **Backend** | Node.js + Express.js | RESTful API server with modular routing |
| **Database** | MongoDB + Mongoose | Document datastore with schema modeling |
| **Tooling** | ESLint 9 (Flat Config) | Code quality and linting across monorepo |

---

## 📁 Monorepo Structure

```text
Job_Track/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/
│   │   └── favicon.svg         # JobTrack branding icon
│   ├── src/
│   │   ├── api/                # Axios instance & health check service
│   │   ├── components/         # UI components (Navbar, Hero, HealthCard, etc.)
│   │   ├── pages/              # Page views (LandingPage)
│   │   ├── App.jsx             # React Router setup
│   │   ├── index.css           # Tailwind CSS imports & themes
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Client environment variable blueprint
│   ├── eslint.config.js        # ESLint flat config for React
│   ├── index.html              # HTML shell & font imports
│   ├── package.json            # Client dependencies & scripts
│   └── vite.config.js          # Vite config with proxy & Tailwind plugin
│
├── server/                     # Backend API Application (Node + Express)
│   ├── src/
│   │   ├── config/             # MongoDB connection logic (Mongoose)
│   │   ├── controllers/        # Request controllers (Health controller)
│   │   ├── routes/             # Express route definitions (/api/health)
│   │   ├── app.js              # Express app, middleware, and error handling
│   │   └── index.js            # Server entry point & graceful listener
│   ├── .env.example            # Server environment variable blueprint
│   ├── eslint.config.js        # ESLint flat config for Node.js
│   └── package.json            # Server dependencies & scripts
│
├── .gitignore                  # Monorepo git ignore specifications
├── package.json                # Root orchestration & scripts (concurrently)
└── README.md                   # Project documentation & runbook
```

---

## ⚙️ Environment Variables

### 1. Server Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Default values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jobtrack
CLIENT_URL=http://localhost:5173
```

### 2. Client Configuration (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```bash
cp client/.env.example client/.env
```
Default values:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22.18)
- **npm**: v9+ (tested on npm 10.9)
- **MongoDB**: Local MongoDB community server (listening on port 27017) or a MongoDB Atlas URI. *(Note: The backend gracefully connects or reports disconnected state without crashing if MongoDB is starting up).*

### 2. Install Dependencies
Run from the root directory to install dependencies for root, client, and server:
```bash
npm run install:all
```
*(Or install in individual folders: `npm install`, `cd client && npm install`, `cd server && npm install`)*

### 3. Run the Applications

#### Option A: Run Both Simultaneously (Recommended)
From the project root:
```bash
npm run dev
```
This boots both the Express server on port 5000 and the Vite React client on port 5173 concurrently with color-coded terminal logs.

#### Option B: Run Individually
- **Run Backend only**:
  ```bash
  npm run server
  ```
  API will be available at `http://localhost:5000`.

- **Run Frontend only**:
  ```bash
  npm run client
  ```
  Vite will launch the web application at `http://localhost:5173`.

---

## 🩺 Health Check API

The backend exposes a health diagnostic endpoint:

### Endpoint
`GET /api/health`

### Example Request
```bash
curl http://localhost:5000/api/health
```

### Example 200 OK Response
```json
{
  "status": "ok",
  "service": "JobTrack API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-15T14:48:00.000Z",
  "uptimeSeconds": 42,
  "database": {
    "status": "connected",
    "healthy": true
  }
}
```

---

## 🧹 Code Quality & Linting

Run ESLint across both client and server applications:
```bash
npm run lint
```
Or individually:
```bash
npm --prefix client run lint
npm --prefix server run lint
```

---

## 🛣️ Roadmap
- [ ] User Authentication & JWT / OAuth2 (Recruiter & Candidate roles)
- [ ] Job Postings CRUD & Filtering
- [ ] Resume upload and applicant profile storage
- [ ] Drag-and-drop Kanban hiring pipeline
- [ ] Email notifications & interview scheduling
