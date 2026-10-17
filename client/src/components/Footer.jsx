import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">JobTrack</span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Modern applicant tracking system and talent acquisition platform designed for speed, structure, and scale.
            </p>
          </div>

          {/* Links: Platform */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/dashboard" className="hover:text-blue-600 transition-colors">Candidate Management</Link></li>
              <li><Link to="/#features" className="hover:text-blue-600 transition-colors">Pipeline Automation</Link></li>
              <li><Link to="/dashboard" className="hover:text-blue-600 transition-colors">Recruiter Dashboard</Link></li>
              <li><Link to="/ui" className="hover:text-blue-600 transition-colors">UI Design System</Link></li>
            </ul>
          </div>

          {/* Links: Resources */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Developers & Ops</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/#system-health" className="hover:text-blue-600 transition-colors">API Diagnostics</Link></li>
              <li><Link to="/#architecture" className="hover:text-blue-600 transition-colors">Architecture Overview</Link></li>
              <li><Link to="/#architecture" className="hover:text-blue-600 transition-colors">Node.js Express & MongoDB</Link></li>
            </ul>
          </div>

          {/* Links: System Status */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Security & Compliance</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Protected with HTTP-only session tokens, strict role-based access control, and bcrypt password encryption.
            </p>
            <Link
              to="/#architecture"
              title="View Security & Architectural Verification"
              className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Security Protocols Active</span>
            </Link>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} JobTrack ATS. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link to="/#system-health" className="hover:text-slate-900 transition-colors">Diagnostics</Link>
            <Link to="/ui" className="hover:text-slate-900 transition-colors">UI Foundation Kit</Link>
            <Link to="/dashboard" className="hover:text-slate-900 transition-colors">Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
