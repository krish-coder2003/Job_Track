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
import Button from './common/Button';

export default function HealthCard({ healthData, loading, error, onRefresh }) {
  const [showJson, setShowJson] = useState(false);

  const isHealthy = healthData?.status === 'ok';
  const isDbConnected = healthData?.database?.status === 'connected';

  return (
    <div
      id="system-health"
      className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Live Health Monitor
            </span>
            <span className="text-xs text-slate-400 font-mono">GET /api/health</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            System Status & Connectivity
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time diagnostics connecting React client to Node/Express backend & MongoDB
          </p>
        </div>

        <Button
          id="btn-refresh-health"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          isLoading={loading}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />}
          className="self-start sm:self-auto"
        >
          {loading ? 'Pinging API...' : 'Ping Endpoint'}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          id="health-error-banner"
          className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Backend Unreachable:</span> {error.message}
            <p className="text-xs text-rose-600/80 mt-1">
              Ensure the backend server is running on port 5000 (<code className="bg-rose-100/70 px-1 py-0.5 rounded">npm run server</code>).
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Backend API status */}
        <div
          id="status-card-api"
          className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Server className="w-4 h-4 text-blue-600" />
              <span>Express API</span>
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isHealthy ? 'Healthy & Online' : 'Offline / Error'}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {healthData?.service || 'JobTrack API'} (v{healthData?.version || '1.0.0'})
            </p>
          </div>
        </div>

        {/* Database status */}
        <div
          id="status-card-db"
          className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>MongoDB Mongoose</span>
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900 capitalize">
              {healthData?.database?.status || 'Connecting'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isDbConnected ? 'Full read/write ready' : 'Local or Atlas standby'}
            </p>
          </div>
        </div>

        {/* Latency */}
        <div
          id="status-card-latency"
          className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Roundtrip Latency</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Axios</span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {healthData?.latency !== undefined ? `${healthData.latency} ms` : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">HTTP Client roundtrip time</p>
          </div>
        </div>

        {/* Uptime */}
        <div
          id="status-card-uptime"
          className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center space-x-1.5 font-medium">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Process Uptime</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase">
              {healthData?.environment || 'dev'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {healthData?.uptimeSeconds !== undefined
                ? `${healthData.uptimeSeconds}s`
                : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Node.js process duration</p>
          </div>
        </div>
      </div>

      {/* JSON Output Accordion / Collapsible */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          id="btn-toggle-json"
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 transition-colors font-mono cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{showJson ? 'Hide Raw API Response' : 'Inspect Raw /api/health JSON'}</span>
        </button>

        {showJson && (
          <div
            id="raw-json-container"
            className="mt-3 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-xs overflow-x-auto"
          >
            <pre>{JSON.stringify(healthData || { error }, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
