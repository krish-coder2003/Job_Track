import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Briefcase,
  LayoutDashboard,
  Users,
  FileText,
  Search,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Sparkles,
  BookmarkCheck,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Badge from '../common/Badge';

export function DashboardLayout({ children, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const toast = useToast();

  const user = userProfile || authUser || {
    name: 'Guest User',
    email: 'guest@example.com',
    role: 'candidate',
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have logged out successfully.', 'Session Ended');
      navigate('/login');
    } catch {
      toast.error('Failed to logout', 'Error');
    }
  };

  // Role-aware navigation links
  const getNavItems = () => {
    if (user.role === 'recruiter') {
      return [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Active Job Listings', href: '/dashboard/jobs', icon: Briefcase, badge: '14' },
        { name: 'Candidate ATS', href: '/dashboard/candidates', icon: Users, badge: '28' },
        { name: 'Review Applications', href: '/dashboard/applications', icon: FileText },
      ];
    }
    if (user.role === 'admin') {
      return [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'User Management', href: '/dashboard/users', icon: Users },
        { name: 'All Job Postings', href: '/dashboard/jobs', icon: Briefcase },
        { name: 'Audit & System', href: '/dashboard/audit', icon: Shield },
      ];
    }
    // Candidate role (default)
    return [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Browse Jobs', href: '/dashboard/jobs', icon: Briefcase },
      { name: 'My Applications', href: '/dashboard/applications', icon: FileText, badge: '3' },
      { name: 'Saved Listings', href: '/dashboard/saved', icon: BookmarkCheck },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                JobTrack <span className="text-xs text-blue-600 font-semibold uppercase">ATS</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-6 space-y-1">
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {user.role === 'recruiter'
                ? 'Recruiter Workspace'
                : user.role === 'admin'
                ? 'Admin Administration'
                : 'Job Seeker Portal'}
            </p>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-blue-200/60 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-6">
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Shortcuts
              </p>
              <Link
                to="/ui"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>UI Components Showcase</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <Badge
                  variant={
                    user.role === 'recruiter' ? 'navy' : user.role === 'admin' ? 'danger' : 'blue'
                  }
                  size="sm"
                >
                  {user.role}
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-white transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 p-1 rounded-md cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
              <span className="capitalize">{user.role} Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-semibold text-slate-900">Workspace Dashboard</span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 w-64">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search platform...</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node,
  userProfile: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
};

export default DashboardLayout;
