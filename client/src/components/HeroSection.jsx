import { Search, MapPin, Sparkles, ArrowRight, Layers, Users, Building2 } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="radial-glow absolute inset-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>JobTrack Monorepo Initialized & Ready</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Streamlined Hiring with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
              JobTrack
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The all-in-one Job Portal and Applicant Tracking System (ATS). Built with modern
            React, Vite, Express, and MongoDB for lightning-fast recruitment workflows.
          </p>

          {/* Mockup Search Bar */}
          <div className="mt-8 p-2 rounded-2xl glass-panel border border-slate-700/80 shadow-2xl max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center space-x-3 px-3 py-2 w-full sm:w-1/2 rounded-xl bg-slate-900/60 border border-slate-800">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  id="mock-input-job"
                  type="text"
                  placeholder="Job title, keywords, or role..."
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                  readOnly
                  value="Full Stack Developer (MERN)"
                />
              </div>

              <div className="flex items-center space-x-3 px-3 py-2 w-full sm:w-1/2 rounded-xl bg-slate-900/60 border border-slate-800">
                <MapPin className="w-4 h-4 text-slate-400" />
                <input
                  id="mock-input-location"
                  type="text"
                  placeholder="Location or Remote"
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                  readOnly
                  value="Remote / Hybrid"
                />
              </div>

              <a
                id="btn-search-jobs"
                href="#system-health"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
              >
                <span>Find Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Metrics / Social Proof */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Multi-Company ATS Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Applicant Pipeline Stages</span>
            </div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Clean MERN Architecture</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
