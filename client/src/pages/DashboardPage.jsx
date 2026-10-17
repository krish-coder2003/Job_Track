import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import CandidateProfileSection from '../components/candidate/CandidateProfileSection';
import CandidateApplicationsSection from '../components/candidate/CandidateApplicationsSection';
import {
  Briefcase,
  Users,
  CalendarCheck,
  TrendingUp,
  Plus,
  ArrowUpRight,
  MoreVertical,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const RECRUITER_STATS = [
  {
    title: 'Active Job Listings',
    value: '14',
    change: '+2 this week',
    icon: Briefcase,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Total Applications',
    value: '248',
    change: '+18% vs last month',
    icon: Users,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    title: 'Interviews Scheduled',
    value: '28',
    change: '4 today',
    icon: CalendarCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Offer Acceptance Rate',
    value: '84%',
    change: '+5.4% improvement',
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

const RECRUITER_CANDIDATES = [
  {
    id: 1,
    name: 'Sarah Connor',
    role: 'Senior Full Stack Engineer',
    appliedDate: 'Oct 14, 2026',
    stage: 'Interview Scheduled',
    stageVariant: 'warning',
    matchScore: 94,
  },
  {
    id: 2,
    name: 'David Kim',
    role: 'React Frontend Specialist',
    appliedDate: 'Oct 15, 2026',
    stage: 'Under Review',
    stageVariant: 'blue',
    matchScore: 89,
  },
  {
    id: 3,
    name: 'Elena Rostova',
    role: 'Backend Node.js Developer',
    appliedDate: 'Oct 12, 2026',
    stage: 'Offer Extended',
    stageVariant: 'success',
    matchScore: 98,
  },
  {
    id: 4,
    name: 'Marcus Vance',
    role: 'DevOps & Cloud Architect',
    appliedDate: 'Oct 10, 2026',
    stage: 'Screening',
    stageVariant: 'gray',
    matchScore: 82,
  },
];

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
                ? 'Real-time candidate pipeline metrics, interview schedules, and active job postings.'
                : isAdmin
                ? 'System administration, user verification, and platform oversight.'
                : 'Track your active job applications, interview notifications, and recruitment status.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isRecruiter ? (
              <>
                <Button variant="secondary" size="sm">
                  Export ATS Report
                </Button>
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create New Job
                </Button>
              </>
            ) : (
              <Link to="/jobs">
                <Button variant="primary" size="sm" leftIcon={<Briefcase className="w-4 h-4" />}>
                  Browse Open Roles
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Recruiter / Admin Stat Cards */}
        {(isRecruiter || isAdmin) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RECRUITER_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} variant="default" className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{stat.change}</span>
                      </p>
                    </div>

                    <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Candidate View: Real Backend Applications Management & Profile */}
        {!isRecruiter && !isAdmin && (
          <>
            {/* Real Applications Section with Summary, Status Filter, Table, Modal & Cancel */}
            <CandidateApplicationsSection />

            {/* Candidate Profile & Resume Section */}
            <CandidateProfileSection user={user} onProfileUpdated={refreshUser} />
          </>
        )}

        {/* Recruiter / Admin Activity Table */}
        {(isRecruiter || isAdmin) && (
          <Card variant="default">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent Candidate Applications</CardTitle>
                <CardDescription>
                  Candidates who recently applied across your active open positions
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="mt-2 sm:mt-0 text-blue-600">
                View Full Pipeline
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-6">Candidate</th>
                      <th className="py-3 px-6">Applied Role</th>
                      <th className="py-3 px-6">Applied Date</th>
                      <th className="py-3 px-6">Hiring Stage</th>
                      <th className="py-3 px-6 text-center">ATS Match</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RECRUITER_CANDIDATES.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900 flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                            {c.name.charAt(0)}
                          </div>
                          <span>{c.name}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{c.role}</td>
                        <td className="py-4 px-6 text-slate-500">{c.appliedDate}</td>
                        <td className="py-4 px-6">
                          <Badge variant={c.stageVariant} dot size="sm">
                            {c.stage}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-bold text-slate-800">{c.matchScore}%</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                            aria-label="Candidate options"
                          >
                            <MoreVertical className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
