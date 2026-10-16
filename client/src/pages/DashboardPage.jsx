import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import {
  Briefcase,
  Users,
  CalendarCheck,
  TrendingUp,
  Plus,
  ArrowUpRight,
  MoreVertical,
} from 'lucide-react';

const STATS = [
  {
    title: 'Active Job Listings',
    value: '14',
    change: '+2 this week',
    isPositive: true,
    icon: Briefcase,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Total Applications',
    value: '248',
    change: '+18% vs last month',
    isPositive: true,
    icon: Users,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    title: 'Interviews Scheduled',
    value: '28',
    change: '4 today',
    isPositive: true,
    icon: CalendarCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Offer Acceptance Rate',
    value: '84%',
    change: '+5.4% improvement',
    isPositive: true,
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

const CANDIDATES = [
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
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Recruitment Overview
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time pipeline metrics, upcoming candidate interviews, and job postings.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="secondary" size="sm">
              Export ATS Report
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Job
            </Button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
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

        {/* Candidate Pipeline Activity */}
        <Card variant="default">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Candidate Applications</CardTitle>
              <CardDescription>
                Candidates who recently applied across all active recruitment listings.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="self-start sm:self-auto">
              View All Candidates
            </Button>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Candidate</th>
                  <th className="py-3 px-6">Role Applied</th>
                  <th className="py-3 px-6">Applied Date</th>
                  <th className="py-3 px-6">Pipeline Stage</th>
                  <th className="py-3 px-6">Match Score</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {CANDIDATES.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {cand.name.charAt(0)}
                      </div>
                      <span>{cand.name}</span>
                    </td>
                    <td className="py-3.5 px-6">{cand.role}</td>
                    <td className="py-3.5 px-6 text-slate-500">{cand.appliedDate}</td>
                    <td className="py-3.5 px-6">
                      <Badge variant={cand.stageVariant} size="sm" dot>
                        {cand.stage}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${cand.matchScore}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-900">{cand.matchScore}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
