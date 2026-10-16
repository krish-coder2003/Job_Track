import { Search, MapPin, Sparkles, ArrowRight, Building2, Users, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './common/Button';

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>JobTrack Enterprise Recruitment Platform</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Streamlined Hiring with{' '}
            <span className="text-blue-600">JobTrack</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The all-in-one Job Portal and Applicant Tracking System (ATS). Built with modern
            React, Vite, Express, and MongoDB for high-velocity recruitment workflows.
          </p>

          {/* Clean Mockup Search Bar */}
          <div className="mt-8 p-2 rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center space-x-3 px-3.5 py-2.5 w-full sm:w-1/2 rounded-xl bg-slate-50 border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="mock-input-job"
                  type="text"
                  placeholder="Job title, keywords, or role..."
                  className="bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none w-full"
                  readOnly
                  value="Senior Full Stack Engineer (MERN)"
                />
              </div>

              <div className="flex items-center space-x-3 px-3.5 py-2.5 w-full sm:w-1/2 rounded-xl bg-slate-50 border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="mock-input-location"
                  type="text"
                  placeholder="Location or Remote"
                  className="bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none w-full"
                  readOnly
                  value="Remote / Hybrid"
                />
              </div>

              <a
                id="btn-search-jobs"
                href="#system-health"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/25 transition-all shrink-0 cursor-pointer"
              >
                <span>Find Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link to="/ui">
              <Button variant="secondary" size="sm">
                Inspect UI Components Foundation
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="subtle" size="sm">
                Preview Recruiter Dashboard
              </Button>
            </Link>
          </div>

          {/* Value Props */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Multi-Company ATS Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Structured Pipeline Stages</span>
            </div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Clean MERN Architecture</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
