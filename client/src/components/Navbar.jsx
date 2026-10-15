import { Briefcase, Activity } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  const isHealthy = healthStatus?.status === 'ok';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              JobTrack
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ATS
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a
            id="nav-features"
            href="#features"
            className="hover:text-indigo-400 transition-colors"
          >
            Features
          </a>
          <a
            id="nav-health"
            href="#system-health"
            className="hover:text-indigo-400 transition-colors flex items-center space-x-1.5"
          >
            <span>System Health</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </a>
          <a
            id="nav-architecture"
            href="#architecture"
            className="hover:text-indigo-400 transition-colors"
          >
            Stack & Architecture
          </a>
        </nav>

        {/* Actions & Health Badge */}
        <div className="flex items-center space-x-3">
          <div
            id="nav-health-status-badge"
            className={`hidden sm:inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isHealthy
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>API {isHealthy ? 'Healthy' : 'Checking...'}</span>
          </div>

          <a
            id="btn-get-started"
            href="#system-health"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <span>Live Health Check</span>
          </a>
        </div>
      </div>
    </header>
  );
}
