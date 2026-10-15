import { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Database,
  Server,
  Clock,
  Zap,
  Code2,
} from 'lucide-react';

export default function HealthCard({ healthData, loading, error, onRefresh }) {
  const [showJson, setShowJson] = useState(false);

  const isHealthy = healthData?.status === 'ok';
  const isDbConnected = healthData?.database?.status === 'connected';

  return (
    <div
      id="system-health"
      className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-slate-700/60 shadow-2xl"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Health Monitor
            </span>
            <span className="text-xs text-slate-400 font-mono">GET /api/health</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center space-x-2">
            <span>System Status & Connectivity</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time diagnostics connecting React client to Node/Express backend & MongoDB
          </p>
        </div>

        <button
          id="btn-refresh-health"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{loading ? 'Pinging API...' : 'Ping Endpoint'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          id="health-error-banner"
          className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start space-x-3 text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Backend Unreachable:</span> {error.message}
            <p className="text-xs text-rose-300/80 mt-1">
              Ensure the backend server is running on port 5000 (<code className="bg-rose-900/50 px-1 py-0.5 rounded">npm run server</code>).
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Backend API status */}
        <div
          id="status-card-api"
          className="glass-card rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Express API</span>
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white flex items-center space-x-2">
              <span>{isHealthy ? 'Healthy & Online' : 'Offline / Error'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {healthData?.service || 'JobTrack API'} (v{healthData?.version || '1.0.0'})
            </p>
          </div>
        </div>

        {/* Database status */}
        <div
          id="status-card-db"
          className="glass-card rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>MongoDB Mongoose</span>
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDbConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white capitalize">
              {healthData?.database?.status || 'Connecting'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isDbConnected ? 'Full read/write ready' : 'Local or Atlas standby'}
            </p>
          </div>
        </div>

        {/* Latency */}
        <div
          id="status-card-latency"
          className="glass-card rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Roundtrip Latency</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Axios</span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">
              {healthData?.latency !== undefined ? `${healthData.latency} ms` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">HTTP Client roundtrip time</p>
          </div>
        </div>

        {/* Uptime */}
        <div
          id="status-card-uptime"
          className="glass-card rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Process Uptime</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase">
              {healthData?.environment || 'dev'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">
              {healthData?.uptimeSeconds !== undefined
                ? `${healthData.uptimeSeconds}s`
                : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Node.js process duration</p>
          </div>
        </div>
      </div>

      {/* JSON Output Accordion / Collapsible */}
      <div className="mt-6 pt-4 border-t border-slate-800/60">
        <button
          id="btn-toggle-json"
          onClick={() => setShowJson(!showJson)}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{showJson ? 'Hide Raw API Response' : 'Inspect Raw /api/health JSON'}</span>
        </button>

        {showJson && (
          <div
            id="raw-json-container"
            className="mt-3 p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto"
          >
            <pre>{JSON.stringify(healthData || { error }, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
