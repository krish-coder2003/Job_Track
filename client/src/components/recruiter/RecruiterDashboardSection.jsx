import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import {
  getJobsApi,
  getRecruiterOverviewApi,
  updateJobStatusApi,
  deleteJobApi,
} from '../../api/job.api';
import {
  formatDate,
  formatJobType,
  formatWorkMode,
  formatApplicationStatus,
} from '../../utils/jobUtils';
import JobFormModal from './JobFormModal';
import JobApplicantsModal from './JobApplicantsModal';
import {
  Briefcase,
  Users,
  CalendarCheck,
  Plus,
  ArrowUpRight,
  Clock,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function RecruiterDashboardSection() {
  const toast = useToast();

  // Overview stats state
  const [overview, setOverview] = useState({
    totalJobs: 0,
    activeJobs: 0,
    closedJobs: 0,
    draftJobs: 0,
    totalApplications: 0,
    awaitingReview: 0,
    byStatus: {},
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Job management state
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState(null);

  // Status toggle confirmation modal
  const [togglingJob, setTogglingJob] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Delete confirmation modal
  const [deletingJob, setDeletingJob] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch Recruiter Live Overview
  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const res = await getRecruiterOverviewApi();
      if (res.data?.overview) {
        setOverview(res.data.overview);
      }
      if (res.data?.recentApplications) {
        setRecentApplications(res.data.recentApplications);
      }
    } catch {
      // Silently handle overview error; jobs table will show details
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  // 2. Fetch Recruiter Jobs List
  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError(null);
    try {
      const params = {
        myJobs: 'true',
        page,
        limit: 10,
        ...(selectedStatusFilter !== 'all' ? { status: selectedStatusFilter } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      };

      const res = await getJobsApi(params);
      const jobsList = res.data?.jobs || res.jobs || [];
      const pag = res.data?.pagination || res.pagination || {
        page: 1,
        limit: 10,
        total: jobsList.length,
        totalPages: 1,
      };

      setJobs(jobsList);
      setPagination(pag);
    } catch (err) {
      setJobsError(err.message || 'Failed to load your job listings.');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [page, selectedStatusFilter, searchQuery]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefreshAll = () => {
    loadOverview();
    loadJobs();
  };

  // Open & Close Job Listing
  const handleToggleStatusConfirm = async () => {
    if (!togglingJob?._id) return;
    setIsTogglingStatus(true);
    const newStatus = togglingJob.status === 'active' ? 'closed' : 'active';

    try {
      await updateJobStatusApi(togglingJob._id, newStatus);
      toast.success(
        `Job "${togglingJob.title}" is now ${newStatus === 'active' ? 'open for applications' : 'closed'}.`,
        'Status Changed'
      );
      setTogglingJob(null);
      loadJobs();
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to update job status.', 'Error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Delete Job Listing
  const handleDeleteConfirm = async () => {
    if (!deletingJob?._id) return;
    setIsDeleting(true);
    try {
      await deleteJobApi(deletingJob._id);
      toast.success(`Job "${deletingJob.title}" has been deleted.`, 'Job Deleted');
      setDeletingJob(null);
      loadJobs();
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to delete job listing.', 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Recruiter Live Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs Posted */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Jobs Posted
              </p>
              {isLoadingOverview ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.totalJobs}</p>
              )}
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="text-blue-600 font-semibold">{overview.activeJobs} active</span>
                <span>•</span>
                <span className="text-slate-400">{overview.closedJobs} closed</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Applications Received */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Applications Received
              </p>
              {isLoadingOverview ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.totalApplications}</p>
              )}
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Across all positions</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Applications Awaiting Review */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Awaiting Review
              </p>
              {isLoadingOverview ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{overview.awaitingReview}</p>
              )}
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending initial screening</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Pipeline Status */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Interview Rounds
              </p>
              {isLoadingOverview ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">
                  {overview.byStatus?.interviewing || 0}
                </p>
              )}
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{overview.byStatus?.shortlisted || 0} shortlisted</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Manage Job Listings Section */}
      <Card variant="default">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle>Manage Job Listings</CardTitle>
            <CardDescription>
              Create, update, toggle open/closed status, and inspect applicants
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              isLoading={isLoadingJobs || isLoadingOverview}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingJob(null);
                setIsFormModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Job
            </Button>
          </div>
        </CardHeader>

        {/* Filter Bar & Search */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Jobs', count: overview.totalJobs },
              { id: 'active', label: 'Active', count: overview.activeJobs },
              { id: 'closed', label: 'Closed', count: overview.closedJobs },
              { id: 'draft', label: 'Drafts', count: overview.draftJobs },
            ].map((tab) => {
              const isSelected = selectedStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search your jobs..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder-slate-400 text-slate-800"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {/* Error State */}
          {jobsError && (
            <div className="p-6">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{jobsError}</span>
                </div>
                <Button variant="danger" size="sm" onClick={loadJobs}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingJobs && !jobsError && (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-28 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingJobs && !jobsError && jobs.length === 0 && (
            <div className="p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedStatusFilter === 'all'
                    ? 'No Job Postings Found'
                    : `No ${selectedStatusFilter} Jobs Found`}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStatusFilter === 'all'
                    ? 'Create your first job listing to start receiving applications from qualified candidates.'
                    : `You have no job listings currently marked as "${selectedStatusFilter}".`}
                </p>
              </div>
              {selectedStatusFilter !== 'all' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStatusFilter('all')}
                >
                  View All Listings
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingJob(null);
                    setIsFormModalOpen(true);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create New Job
                </Button>
              )}
            </div>
          )}

          {/* Jobs Table */}
          {!isLoadingJobs && !jobsError && jobs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-6">Position & Company</th>
                    <th className="py-3 px-6">Location</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Applicants</th>
                    <th className="py-3 px-6">Posted Date</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const isActive = job.status === 'active';
                    const isClosed = job.status === 'closed';
                    const applicantsCount = job.applicationsCount || 0;
                    const awaitingReviewCount = job.awaitingReviewCount || 0;

                    return (
                      <tr key={job._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Title & Company */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <Link
                              to={`/jobs/${job._id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"
                            >
                              <span>{job.title}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                            </Link>
                            <div className="text-slate-500">
                              {job.company} • {formatJobType(job.jobType)}
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-6 text-slate-600">
                          <div>{job.location}</div>
                          <span className="text-[10px] text-slate-400">
                            {formatWorkMode(job.workMode)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <Badge
                            variant={
                              isActive ? 'success' : isClosed ? 'danger' : 'gray'
                            }
                            dot
                            size="sm"
                          >
                            {isActive ? 'Active' : isClosed ? 'Closed' : 'Draft'}
                          </Badge>
                        </td>

                        {/* Applicants Count Pill */}
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => setSelectedJobForApplicants(job)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <Users className="w-3 h-3" />
                            <span>{applicantsCount} applicant{applicantsCount === 1 ? '' : 's'}</span>
                            {awaitingReviewCount > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                                {awaitingReviewCount} new
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Posted Date */}
                        <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                          {formatDate(job.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Applicants Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedJobForApplicants(job)}
                              title="View Candidate Applicants"
                              leftIcon={<Users className="w-3.5 h-3.5 text-blue-600" />}
                            >
                              Applicants
                            </Button>

                            {/* Open / Close Toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTogglingJob(job)}
                              title={isActive ? 'Close listing' : 'Reopen listing'}
                              className={
                                isActive
                                  ? 'text-amber-600 hover:text-amber-700'
                                  : 'text-emerald-600 hover:text-emerald-700'
                              }
                            >
                              {isActive ? 'Close' : 'Reopen'}
                            </Button>

                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingJob(job);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit listing"
                              className="text-slate-600 hover:text-slate-900"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingJob(job)}
                              title="Delete listing"
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoadingJobs && !jobsError && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page <strong>{pagination.page}</strong> of{' '}
                <strong>{pagination.totalPages}</strong> ({pagination.total} total jobs)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Recent Candidate Applications Pipeline */}
      <Card variant="default">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent Candidate Applications</CardTitle>
            <CardDescription>
              Newest applicants across all your active positions
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recentApplications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No recent applications received yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-6">Candidate</th>
                    <th className="py-3 px-6">Applied Role</th>
                    <th className="py-3 px-6">Applied Date</th>
                    <th className="py-3 px-6">Hiring Stage</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map((app) => {
                    const statusMeta = formatApplicationStatus(app.status);
                    const candidate = app.candidate || {};
                    const job = app.job || {};

                    return (
                      <tr key={app._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900 flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">
                            {candidate.name ? candidate.name.charAt(0) : 'C'}
                          </div>
                          <div>
                            <div>{candidate.name || 'Anonymous Candidate'}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {candidate.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="font-medium text-slate-800">{job.title}</div>
                          <div className="text-[11px] text-slate-400">{job.company}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-500">{formatDate(app.createdAt)}</td>
                        <td className="py-4 px-6">
                          <Badge variant={statusMeta.variant} dot size="sm">
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJobForApplicants(job)}
                            leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Modals */}
      {/* Create / Edit Job Modal */}
      <JobFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingJob(null);
        }}
        jobToEdit={editingJob}
        onJobSaved={() => {
          loadJobs();
          loadOverview();
        }}
      />

      {/* Job Applicants Modal */}
      <JobApplicantsModal
        isOpen={Boolean(selectedJobForApplicants)}
        onClose={() => {
          setSelectedJobForApplicants(null);
          loadOverview();
          loadJobs();
        }}
        job={selectedJobForApplicants}
      />

      {/* Status Toggle Confirmation Modal */}
      {togglingJob && (
        <Modal
          isOpen={Boolean(togglingJob)}
          onClose={() => !isTogglingStatus && setTogglingJob(null)}
          title={togglingJob.status === 'active' ? 'Close Job Listing' : 'Reopen Job Listing'}
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTogglingJob(null)}
                disabled={isTogglingStatus}
              >
                Cancel
              </Button>
              <Button
                variant={togglingJob.status === 'active' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleStatusConfirm}
                isLoading={isTogglingStatus}
              >
                {togglingJob.status === 'active' ? 'Confirm Close Job' : 'Confirm Reopen'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              {togglingJob.status === 'active' ? (
                <>
                  Are you sure you want to close <strong>{togglingJob.title}</strong>? Candidates will no
                  longer be able to submit new applications for this position.
                </>
              ) : (
                <>
                  Are you sure you want to reopen <strong>{togglingJob.title}</strong>? Candidates will
                  immediately be able to discover and apply for this job again.
                </>
              )}
            </p>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingJob && (
        <Modal
          isOpen={Boolean(deletingJob)}
          onClose={() => !isDeleting && setDeletingJob(null)}
          title="Delete Job Listing"
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingJob(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Irreversible Action</p>
                <p className="mt-0.5">
                  Are you sure you want to permanently delete{' '}
                  <strong>{deletingJob.title}</strong>? This listing and its associated candidate links
                  will be removed.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
