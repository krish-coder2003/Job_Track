import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Briefcase, Activity, Menu, X, Sparkles, LayoutDashboard, LogIn, LogOut, User } from 'lucide-react';
import Button from './common/Button';
import Badge from './common/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from './common/Toast';

export default function Navbar({ healthStatus }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const isHealthy = healthStatus?.status === 'ok';

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been logged out.', 'Signed Out');
      navigate('/login');
    } catch {
      toast.error('Failed to log out cleanly', 'Error');
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'recruiter':
        return 'navy';
      case 'admin':
        return 'danger';
      case 'candidate':
      default:
        return 'blue';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              JobTrack
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
              ATS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <Link
            to="/dashboard"
            className="hover:text-blue-600 transition-colors flex items-center space-x-1.5"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/ui"
            className="hover:text-blue-600 transition-colors flex items-center space-x-1.5 text-blue-700 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>UI Kit</span>
          </Link>
          <a
            href="/#system-health"
            className="hover:text-blue-600 transition-colors flex items-center space-x-1.5"
          >
            <span>System Health</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
          </a>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center space-x-3">
          <div
            id="nav-health-status-badge"
            className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isHealthy
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>API {isHealthy ? 'Online' : 'Checking'}</span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <Link to="/dashboard" className="flex items-center space-x-2 text-left group">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="hidden lg:block leading-tight">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {user?.name}
                  </div>
                  <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                    {user?.role}
                  </Badge>
                </div>
              </Link>

              <Button
                variant="subtle"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
                aria-label="Log out"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                  Sign In
                </Button>
              </Link>

              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-lg">
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                {user?.role}
              </Badge>
            </div>
          )}

          <div className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>Workspace Dashboard</span>
            </Link>
            <Link
              to="/ui"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>UI Components Showcase</span>
            </Link>
            <a
              href="/#system-health"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              System Health Check
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="w-full justify-center"
              >
                Sign Out
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="primary" size="md" className="w-full justify-center">
                    Register Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

Navbar.propTypes = {
  healthStatus: PropTypes.shape({
    status: PropTypes.string,
    timestamp: PropTypes.string,
  }),
};
