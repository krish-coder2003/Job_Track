import { Link } from 'react-router-dom';
import { Compass, Home, Sparkles, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-xs">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Error 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              The page you are trying to reach does not exist, has been relocated, or is temporarily offline.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />} className="w-full sm:w-auto">
                Return Home
              </Button>
            </Link>

            <Link to="/ui" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" leftIcon={<Sparkles className="w-4 h-4 text-blue-600" />} className="w-full sm:w-auto">
                Explore UI Kit
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go back to previous page</span>
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
