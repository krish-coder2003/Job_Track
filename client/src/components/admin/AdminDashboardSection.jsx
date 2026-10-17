import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import {
  getAdminDashboardApi,
  getAdminUsersApi,
  updateUserStatusApi,
  getAdminJobsApi,
  moderateJobApi,
} from '../../api/admin.api';
import { formatDate } from '../../utils/jobUtils';
import {
  Shield,
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  Unlock,
  Clock,
  Eye,
  Check,
  Ban,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';

export default function AdminDashboardSection() {
  const toast = useToast();

  // Active sub-tab: 'users' or 'jobs'
  const [activeTab, setActiveTab] = useState('users');

  // Platform statistics
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [jobPagination, setJobPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [jobPage, setJobPage] = useState(1);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobApprovalFilter, setJobApprovalFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // User status modal state
  const [selectedUserForStatus, setSelectedUserForStatus] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  const [isUpdatingUserStatus, setIsUpdatingUserStatus] = useState(false);

  // Job moderation modal state
  const [selectedJobForModeration, setSelectedJobForModeration] = useState(null);
  const [moderationApproved, setModerationApproved] = useState(true);
  const [moderationStatus, setModerationStatus] = useState('active');
  const [moderationNote, setModerationNote] = useState('');
  const [isModeratingJob, setIsModeratingJob] = useState(false);

  // 1. Fetch Platform Statistics
  const loadDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await getAdminDashboardApi();
      setStats(response.data || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load platform statistics.', 'Stats Error');
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  // 2. Fetch Users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const params = {
        page: userPage,
        limit: 10,
        ...(userRoleFilter !== 'all' ? { role: userRoleFilter } : {}),
        ...(userStatusFilter !== 'all' ? { status: userStatusFilter } : {}),
        ...(userSearch.trim() ? { search: userSearch.trim() } : {}),
      };

      const response = await getAdminUsersApi(params);
      setUsers(response.data?.users || []);
      setUserPagination(response.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve users.', 'Users Error');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userPage, userRoleFilter, userStatusFilter, userSearch, toast]);

  // 3. Fetch Jobs
  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const params = {
        page: jobPage,
        limit: 10,
        ...(jobStatusFilter !== 'all' ? { status: jobStatusFilter } : {}),
        ...(jobApprovalFilter !== 'all' ? { isApproved: jobApprovalFilter } : {}),
        ...(jobSearch.trim() ? { search: jobSearch.trim() } : {}),
      };

      const response = await getAdminJobsApi(params);
      setJobs(response.data?.jobs || []);
      setJobPagination(response.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve jobs for moderation.', 'Jobs Error');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [jobPage, jobStatusFilter, jobApprovalFilter, jobSearch, toast]);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [activeTab, loadJobs]);

  const handleRefreshAll = () => {
    loadDashboardStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'jobs') loadJobs();
  };

  // Handle User Status Change (Disable / Reactivate)
  const handleConfirmUserStatus = async () => {
    if (!selectedUserForStatus) return;
    setIsUpdatingUserStatus(true);
    const newStatus = selectedUserForStatus.status === 'active' ? 'disabled' : 'active';

    try {
      await updateUserStatusApi(selectedUserForStatus._id, newStatus, disableReason);
      toast.success(
        `Account for ${selectedUserForStatus.name} is now ${newStatus === 'active' ? 'reactivated' : 'disabled'}.`,
        'User Status Updated'
      );
      setSelectedUserForStatus(null);
      setDisableReason('');
      loadUsers();
      loadDashboardStats();
    } catch (err) {
      toast.error(err.message || 'Failed to update user status.', 'Status Error');
    } finally {
      setIsUpdatingUserStatus(false);
    }
  };

  // Handle Job Moderation
  const handleConfirmJobModeration = async () => {
    if (!selectedJobForModeration) return;
    setIsModeratingJob(true);

    try {
      await moderateJobApi(selectedJobForModeration._id, {
        isApproved: moderationApproved,
        status: moderationStatus,
        moderationNote,
      });

      toast.success(
        `Job "${selectedJobForModeration.title}" has been ${moderationApproved ? 'approved' : 'rejected / unapproved'}.`,
        'Moderation Saved'
      );
      setSelectedJobForModeration(null);
      loadJobs();
      loadDashboardStats();
    } catch (err) {
      toast.error(err.message || 'Failed to moderate job listing.', 'Moderation Error');
    } finally {
      setIsModeratingJob(false);
    }
  };

  const overview = stats?.overview || {};

  return (
    <div className="space-y-8">
      {/* 1. Platform Statistics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Platform Users
              </p>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.totalUsers || 0}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <span>{stats?.users?.byRole?.candidate || 0} candidates</span>
                <span>•</span>
                <span>{stats?.users?.byRole?.recruiter || 0} recruiters</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Jobs */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Job Listings
              </p>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.totalJobs || 0}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span>{stats?.jobs?.byStatus?.active || 0} active</span>
                <span>•</span>
                <span>{stats?.jobs?.byStatus?.closed || 0} closed</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Applications Submitted */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Applications
              </p>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.totalApplications || 0}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <span>{stats?.applications?.byStatus?.pending || 0} pending review</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Moderation Queue */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Job Moderation Queue
              </p>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">
                  {stats?.jobs?.moderation?.pendingApproval || 0}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                {stats?.jobs?.moderation?.pendingApproval > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Requires review</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">All jobs moderated</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Admin Management Controls & Tabs */}
      <Card variant="default">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle>Platform Administration & Oversight</CardTitle>
            </div>
            <CardDescription>
              Manage user accounts, enforce safety status, and moderate platform job listings
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Data
            </Button>
          </div>
        </CardHeader>

        {/* Tab Selection */}
        <div className="px-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts ({overview.totalUsers || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Listings & Moderation ({overview.totalJobs || 0})</span>
            {stats?.jobs?.moderation?.pendingApproval > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                {stats.jobs.moderation.pendingApproval}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div>
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium cursor-pointer focus:outline-hidden"
                >
                  <option value="all">All Roles</option>
                  <option value="candidate">Candidates</option>
                  <option value="recruiter">Recruiters</option>
                  <option value="admin">Administrators</option>
                </select>

                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium cursor-pointer focus:outline-hidden"
                >
                  <option value="all">All Account Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>

              <div className="text-slate-500">
                Total Users: <strong>{userPagination.total}</strong>
              </div>
            </div>

            {/* Users Table */}
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No users found matching the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-6">User</th>
                        <th className="py-3 px-6">Role</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Activity</th>
                        <th className="py-3 px-6">Registered</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => {
                        const isSelf = u.email === stats?.currentAdminEmail;
                        return (
                          <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                            {/* User details */}
                            <td className="py-3.5 px-6 font-semibold text-slate-900">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  {u.name ? u.name.charAt(0) : 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{u.name || 'Unnamed User'}</div>
                                  <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-6">
                              <Badge
                                variant={
                                  u.role === 'admin'
                                    ? 'danger'
                                    : u.role === 'recruiter'
                                    ? 'navy'
                                    : 'blue'
                                }
                                size="sm"
                              >
                                {u.role}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-6">
                              <Badge
                                variant={u.status === 'active' ? 'success' : 'danger'}
                                dot
                                size="sm"
                              >
                                {u.status}
                              </Badge>
                              {u.disabledReason && (
                                <div className="text-[10px] text-slate-400 truncate max-w-xs pt-0.5">
                                  Reason: {u.disabledReason}
                                </div>
                              )}
                            </td>

                            {/* Activity */}
                            <td className="py-3.5 px-6 text-slate-600">
                              {u.role === 'recruiter' && (
                                <span>{u.jobsPostedCount || 0} jobs posted</span>
                              )}
                              {u.role === 'candidate' && (
                                <span>{u.applicationsSubmittedCount || 0} applications</span>
                              )}
                              {u.role === 'admin' && (
                                <span className="text-slate-400">Platform Admin</span>
                              )}
                            </td>

                            {/* Registered */}
                            <td className="py-3.5 px-6 text-slate-500">{formatDate(u.createdAt)}</td>

                            {/* Actions */}
                            <td className="py-3.5 px-6 text-right">
                              {u.status === 'active' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForStatus(u);
                                    setDisableReason('');
                                  }}
                                  leftIcon={<UserX className="w-3.5 h-3.5 text-rose-500" />}
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                >
                                  Disable Account
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForStatus(u);
                                    setDisableReason('');
                                  }}
                                  leftIcon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                >
                                  Reactivate
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* User Pagination */}
              {!isLoadingUsers && userPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    Page <strong>{userPagination.page}</strong> of{' '}
                    <strong>{userPagination.totalPages}</strong> ({userPagination.total} users)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPagination.page <= 1}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage((p) => p + 1)}
                      disabled={userPagination.page >= userPagination.totalPages}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        )}

        {/* TAB 2: JOB MODERATION */}
        {activeTab === 'jobs' && (
          <div>
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search title or company..."
                    value={jobSearch}
                    onChange={(e) => {
                      setJobSearch(e.target.value);
                      setJobPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Approval Filter */}
                <select
                  value={jobApprovalFilter}
                  onChange={(e) => {
                    setJobApprovalFilter(e.target.value);
                    setJobPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium cursor-pointer focus:outline-hidden"
                >
                  <option value="all">All Moderation States</option>
                  <option value="false">Pending Approval / Unapproved</option>
                  <option value="true">Approved</option>
                </select>

                {/* Status Filter */}
                <select
                  value={jobStatusFilter}
                  onChange={(e) => {
                    setJobStatusFilter(e.target.value);
                    setJobPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium cursor-pointer focus:outline-hidden"
                >
                  <option value="all">All Job Statuses</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="text-slate-500">
                Total Jobs: <strong>{jobPagination.total}</strong>
              </div>
            </div>

            {/* Jobs Table */}
            <CardContent className="p-0">
              {isLoadingJobs ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No jobs found matching the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-6">Job Listing</th>
                        <th className="py-3 px-6">Recruiter</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Moderation</th>
                        <th className="py-3 px-6 text-center">Applications</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => (
                        <tr key={job._id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Title & Company */}
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-900">{job.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {job.company} • {job.location} • {job.jobType}
                            </div>
                          </td>

                          {/* Recruiter info */}
                          <td className="py-3.5 px-6 text-slate-600">
                            <div>{job.recruiter?.name || 'Recruiter'}</div>
                            <div className="text-[11px] text-slate-400">{job.recruiter?.email}</div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-6">
                            <Badge
                              variant={job.status === 'active' ? 'success' : 'gray'}
                              dot
                              size="sm"
                            >
                              {job.status}
                            </Badge>
                          </td>

                          {/* Moderation */}
                          <td className="py-3.5 px-6">
                            <Badge
                              variant={job.isApproved ? 'success' : 'warning'}
                              size="sm"
                            >
                              {job.isApproved ? 'Approved' : 'Pending Moderation'}
                            </Badge>
                            {job.moderationNote && (
                              <div className="text-[10px] text-slate-400 italic max-w-xs truncate pt-0.5">
                                Note: {job.moderationNote}
                              </div>
                            )}
                          </td>

                          {/* Applications Count */}
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                              {job.applicationsCount || 0}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-6 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJobForModeration(job);
                                setModerationApproved(job.isApproved);
                                setModerationStatus(job.status || 'active');
                                setModerationNote(job.moderationNote || '');
                              }}
                              leftIcon={<Shield className="w-3.5 h-3.5" />}
                            >
                              Moderate
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Job Pagination */}
              {!isLoadingJobs && jobPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    Page <strong>{jobPagination.page}</strong> of{' '}
                    <strong>{jobPagination.totalPages}</strong> ({jobPagination.total} jobs)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                      disabled={jobPagination.page <= 1}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobPage((p) => p + 1)}
                      disabled={jobPagination.page >= jobPagination.totalPages}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        )}
      </Card>

      {/* 3. MODALS */}

      {/* User Status Modal (Disable / Reactivate) */}
      {selectedUserForStatus && (
        <Modal
          isOpen={Boolean(selectedUserForStatus)}
          onClose={() => !isUpdatingUserStatus && setSelectedUserForStatus(null)}
          title={
            selectedUserForStatus.status === 'active'
              ? 'Disable User Account'
              : 'Reactivate User Account'
          }
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedUserForStatus(null)}
                disabled={isUpdatingUserStatus}
              >
                Cancel
              </Button>
              <Button
                variant={selectedUserForStatus.status === 'active' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleConfirmUserStatus}
                isLoading={isUpdatingUserStatus}
              >
                {selectedUserForStatus.status === 'active' ? 'Confirm Disable' : 'Confirm Reactivate'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Are you sure you want to{' '}
              <strong>{selectedUserForStatus.status === 'active' ? 'disable' : 'reactivate'}</strong>{' '}
              account for <strong>{selectedUserForStatus.name}</strong> ({selectedUserForStatus.email})?
            </p>

            {selectedUserForStatus.role === 'admin' && selectedUserForStatus.status === 'active' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Administrator Account:</strong> JobTrack prohibits disabling the last active administrator on the platform.
                </span>
              </div>
            )}

            {selectedUserForStatus.status === 'active' && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Reason for disabling (optional):</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Terms of service violation, suspicious activity..."
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 resize-none focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Job Moderation Modal */}
      {selectedJobForModeration && (
        <Modal
          isOpen={Boolean(selectedJobForModeration)}
          onClose={() => !isModeratingJob && setSelectedJobForModeration(null)}
          title={`Moderate Job • ${selectedJobForModeration.title}`}
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedJobForModeration(null)}
                disabled={isModeratingJob}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmJobModeration}
                isLoading={isModeratingJob}
              >
                Save Moderation Decision
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">{selectedJobForModeration.title}</div>
              <div className="text-slate-500">
                Company: {selectedJobForModeration.company} • Recruiter: {selectedJobForModeration.recruiter?.name} ({selectedJobForModeration.recruiter?.email})
              </div>
            </div>

            {/* Approval Decision */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">Moderation Approval Status:</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="approval"
                    checked={moderationApproved === true}
                    onChange={() => setModerationApproved(true)}
                  />
                  <span className="font-medium text-emerald-700">Approved for Platform</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="approval"
                    checked={moderationApproved === false}
                    onChange={() => setModerationApproved(false)}
                  />
                  <span className="font-medium text-rose-700">Reject / Require Revisions</span>
                </label>
              </div>
            </div>

            {/* Listing State */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-800">Job Status:</label>
              <select
                value={moderationStatus}
                onChange={(e) => setModerationStatus(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="active">Active (Open for candidate applications)</option>
                <option value="closed">Closed (No new applications accepted)</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Moderation Note */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-800">Moderator Note / Feedback:</label>
              <textarea
                rows={2}
                placeholder="Internal feedback on job content, company verification, or reason for revision..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
