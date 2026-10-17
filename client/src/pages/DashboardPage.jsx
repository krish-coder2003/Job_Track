import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import CandidateProfileSection from '../components/candidate/CandidateProfileSection';
import CandidateApplicationsSection from '../components/candidate/CandidateApplicationsSection';
import RecruiterDashboardSection from '../components/recruiter/RecruiterDashboardSection';
import AdminDashboardSection from '../components/admin/AdminDashboardSection';
import {
  Briefcase,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const isRecruiter = user?.role === 'recruiter';
  const isAdmin = user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back, {user?.name || 'User'}
              </h1>
              <Badge variant={isRecruiter ? 'navy' : isAdmin ? 'danger' : 'blue'}>
                {user?.role || 'candidate'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isRecruiter
                ? 'Real-time candidate pipeline metrics, job listings management, and application reviews.'
                : isAdmin
                ? 'System administration, user verification, job moderation, and platform oversight.'
                : 'Track your active job applications, interview notifications, and recruitment status.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link to="/jobs">
              <Button variant="outline" size="sm" leftIcon={<Briefcase className="w-4 h-4" />}>
                Browse Job Board
              </Button>
            </Link>
          </div>
        </div>

        {/* Administrator Platform Management View */}
        {isAdmin && <AdminDashboardSection />}

        {/* Recruiter Live View */}
        {isRecruiter && <RecruiterDashboardSection />}

        {/* Candidate View: Real Backend Applications Management & Profile */}
        {!isRecruiter && !isAdmin && (
          <>
            {/* Real Applications Section with Summary, Status Filter, Table, Modal & Cancel */}
            <CandidateApplicationsSection />

            {/* Candidate Profile & Resume Section */}
            <CandidateProfileSection user={user} onProfileUpdated={refreshUser} />
          </>
        )}

        {/* System & Session Information Box */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-blue-900 gap-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Connected as <strong className="font-semibold">{user?.email}</strong> with role{' '}
              <strong className="font-semibold capitalize">{user?.role}</strong> via secure HTTP-only cookies.
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-blue-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Session verified by GET /api/auth/me</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

