import { Terminal, FolderTree, Cpu } from 'lucide-react';

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-16 border-t border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            System Blueprints
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Clean Monorepo Architecture
          </h2>
          <p className="mt-3 text-slate-600 text-sm">
            Separated client and server layers with unified npm scripts, ESLint flat configs, and environment variable isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Directory Structure Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 text-slate-900 text-sm font-semibold">
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span>Project Directory Structure</span>
            </div>
            <pre className="mt-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto bg-slate-900 p-4 rounded-lg border border-slate-800">
{`Job_Track/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets & favicon
│   ├── src/
│   │   ├── api/                # Axios instance & health API
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── pages/              # Landing, Dashboard, Showcase, 404
│   │   ├── App.jsx             # React Router DOM configuration
│   │   ├── index.css           # Tailwind CSS styles & tokens
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Client env blueprint
│   ├── eslint.config.js        # ESLint flat config
│   ├── package.json            # React, Vite, Tailwind, Axios
│   └── vite.config.js          # Vite config with proxy
├── server/                     # Backend API Application
│   ├── src/
│   │   ├── config/             # Mongoose db connection
│   │   ├── controllers/        # Health, Auth controllers
│   │   ├── middlewares/        # Auth, Role, Error middlewares
│   │   ├── models/             # User Mongoose model
│   │   ├── routes/             # Health, Auth Express routers
│   │   ├── services/           # Business logic & hashing
│   │   ├── app.js              # Express app setup & middleware
│   │   └── index.js            # Server entry & listener
│   ├── .env.example            # Server env blueprint
│   ├── eslint.config.js        # Node ESLint flat config
│   └── package.json            # Express, Mongoose, JWT, Bcrypt
├── .gitignore                  # Monorepo git ignore rules
├── package.json                # Root monorepo scripts (concurrently)
└── README.md                   # Setup guide & API docs`}
            </pre>
          </div>

          {/* Quick CLI Scripts & Stack */}
          <div className="space-y-6">
            {/* Commands Box */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 text-slate-900 text-sm font-semibold">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Available npm Scripts</span>
              </div>
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-blue-700 font-semibold">npm run dev</span>
                  <span className="text-slate-600 font-sans">Run both Server & Client concurrently</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-blue-700 font-semibold">npm run client</span>
                  <span className="text-slate-600 font-sans">Start Vite dev server (port 5173)</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-blue-700 font-semibold">npm run server</span>
                  <span className="text-slate-600 font-sans">Start Express nodemon (port 5000)</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-blue-700 font-semibold">npm run lint</span>
                  <span className="text-slate-600 font-sans">Run ESLint across monorepo</span>
                </div>
              </div>
            </div>

            {/* Stack Badges */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
              <div className="text-sm font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Configured Technology Stack</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  ⚛️ React 19 + Vite
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  🌐 Express.js
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  🍃 MongoDB + Mongoose
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  🎨 Tailwind CSS v4
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  🧭 React Router DOM
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  ⚡ Axios
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  🛡️ JWT + HTTP-Only Cookies
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                  ✨ ESLint 9 Flat Config
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
