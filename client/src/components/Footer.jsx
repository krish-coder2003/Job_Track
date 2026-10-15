import { Briefcase } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">JobTrack</span>
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} JobTrack ATS. All rights reserved.
          </span>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">
            Features
          </a>
          <a href="#system-health" className="hover:text-slate-200 transition-colors">
            Health Check
          </a>
          <a href="#architecture" className="hover:text-slate-200 transition-colors">
            Architecture
          </a>
        </div>
      </div>
    </footer>
  );
}
