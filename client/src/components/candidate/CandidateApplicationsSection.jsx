import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import { getMyApplicationsApi, cancelApplicationApi } from '../../api/application.api';
import { downloadMyResumeApi } from '../../api/user.api';
import {
  formatDate,
  formatApplicationStatus,
  formatJobType,
  formatWorkMode,
  formatSalary,
} from '../../utils/jobUtils';
import {
  Briefcase,
  CalendarCheck,
  Send,
  Award,
  Clock,
  Eye,
  XCircle,
  FileText,
  Building2,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Download,
  AlertTriangle,
  RefreshCw,
  History,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'all', label: 'All Applications' },
  { id: 'pending', label: 'Submitted' },
  { id: 'reviewing', label: 'In Review' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Not Selected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

export default function CandidateApplicationsSection({ onStatsLoaded }) {
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {},
  });

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [detailsApplication, setDetailsApplication] = useState(null);
  const [withdrawingApplication, setWithdrawingApplication] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);

  // Fetch applications from backend
  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
      };

      const response = await getMyApplicationsApi(params);
      const data = response.data || {};

      setApplications(data.applications || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasMore: false,
        }
      );
      setSummary(
        data.summary || {
          total: 0,
          byStatus: {},
        }
      );

      if (onStatsLoaded && data.summary) {
        onStatsLoaded(data.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your submitted applications.');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedStatus, onStatsLoaded]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusFilter = (statusId) => {
    setSelectedStatus(statusId);
    setPage(1);
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawingApplication?._id) return;

    setIsWithdrawing(true);
    try {
      await cancelApplicationApi(withdrawingApplication._id);
      toast.success(
        `Application for ${withdrawingApplication.job?.title || 'position'} has been withdrawn.`,
        'Application Withdrawn'
      );
      setWithdrawingApplication(null);
      if (detailsApplication?._id === withdrawingApplication._id) {
        setDetailsApplication(null);
      }
      loadApplications();
    } catch (err) {
      toast.error(
        err.message || 'Failed to withdraw application.',
        'Action Failed'
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDownloadSnapshot = async () => {
    setIsDownloadingResume(true);
    try {
      await downloadMyResumeApi();
      toast.success('Your submitted resume download has started.', 'Download Ready');
    } catch (err) {
      toast.error(err.message || 'Failed to download resume file.', 'Download Error');
    } finally {
      setIsDownloadingResume(false);
    }
  };

  // Helper check for cancellation permission
  const isCancellable = (app) =>
    app && (app.status === 'pending' || app.status === 'reviewing');

  const pendingCount =
    (summary.byStatus?.pending || 0) + (summary.byStatus?.reviewing || 0);
  const interviewCount = summary.byStatus?.interviewing || 0;
  const offerCount =
    (summary.byStatus?.accepted || 0) + (summary.byStatus?.shortlisted || 0);

  return (
    <div className="space-y-6">
      {/* 1. Server-Calculated Candidate Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Applications
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{summary.total}</p>
              )}
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span>All submitted roles</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending / Active Review */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Under Active Review
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
              )}
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending initial decision</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Interviews Scheduled */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Interviews Scheduled
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{interviewCount}</p>
              )}
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active interview rounds</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Shortlisted & Offers */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Shortlisted & Offers
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-black text-slate-900">{offerCount}</p>
              )}
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Top candidate selections</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. My Applications Management Card */}
      <Card variant="default">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle>My Submitted Applications</CardTitle>
            <CardDescription>
              Authoritative real-time tracking of positions you have applied for
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadApplications}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Link to="/jobs">
              <Button variant="primary" size="sm" leftIcon={<Briefcase className="w-3.5 h-3.5" />}>
                Browse Roles
              </Button>
            </Link>
          </div>
        </CardHeader>

        {/* Status Filter Tabs / Pills */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto flex items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedStatus === tab.id;
            const count =
              tab.id === 'all'
                ? summary.total
                : tab.id === 'withdrawn'
                ? (summary.byStatus?.withdrawn || 0) + (summary.byStatus?.cancelled || 0)
                : summary.byStatus?.[tab.id] || 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <CardContent className="p-0">
          {/* Error State */}
          {error && (
            <div className="p-6">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button variant="danger" size="sm" onClick={loadApplications}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Loading Skeleton State */}
          {isLoading && !error && (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && applications.length === 0 && (
            <div className="p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedStatus === 'all'
                    ? 'No Job Applications Yet'
                    : `No ${formatApplicationStatus(selectedStatus).label} Applications`}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStatus === 'all'
                    ? 'Explore open positions and apply with your profile and verified resume.'
                    : `You do not have any applications matching the '${selectedStatus}' filter.`}
                </p>
              </div>
              {selectedStatus !== 'all' ? (
                <Button variant="outline" size="sm" onClick={() => handleStatusFilter('all')}>
                  Clear Status Filter
                </Button>
              ) : (
                <Link to="/jobs">
                  <Button variant="primary" size="sm" leftIcon={<Briefcase className="w-3.5 h-3.5" />}>
                    Explore Open Positions
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Applications Table */}
          {!isLoading && !error && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-6">Company & Position</th>
                    <th className="py-3 px-6">Location</th>
                    <th className="py-3 px-6">Applied Date</th>
                    <th className="py-3 px-6">Application Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const statusMeta = formatApplicationStatus(app.status);
                    const canWithdraw = isCancellable(app);
                    const job = app.job || {};

                    return (
                      <tr key={app._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Company & Role */}
                        <td className="py-4 px-6">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {job.company ? job.company.charAt(0) : 'J'}
                            </div>
                            <div className="space-y-0.5">
                              {job._id ? (
                                <Link
                                  to={`/jobs/${job._id}`}
                                  className="font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 group"
                                >
                                  <span>{job.title || 'Untitled Role'}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                </Link>
                              ) : (
                                <span className="font-bold text-slate-900">
                                  {job.title || 'Position Unavailable'}
                                </span>
                              )}
                              <div className="text-slate-500 font-medium">
                                {job.company || 'Unknown Company'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Location & WorkMode */}
                        <td className="py-4 px-6 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{job.location || 'Remote'}</span>
                          </div>
                          {job.workMode && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {formatWorkMode(job.workMode)}
                            </span>
                          )}
                        </td>

                        {/* Applied Date */}
                        <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                          <div>{formatDate(app.createdAt)}</div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Application Status Badge */}
                        <td className="py-4 px-6">
                          <Badge variant={statusMeta.variant} dot size="sm">
                            {statusMeta.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailsApplication(app)}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              className="text-slate-600 hover:text-slate-900"
                            >
                              Details
                            </Button>

                            {canWithdraw && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setWithdrawingApplication(app)}
                                leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Withdraw
                              </Button>
                            )}
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
          {!isLoading && !error && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page <strong>{pagination.page}</strong> of{' '}
                <strong>{pagination.totalPages}</strong> ({pagination.total} total applications)
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

      {/* 3. Application Details Modal */}
      {detailsApplication && (
        <Modal
          isOpen={Boolean(detailsApplication)}
          onClose={() => setDetailsApplication(null)}
          title="Application Details"
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {isCancellable(detailsApplication) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWithdrawingApplication(detailsApplication);
                    }}
                    leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Withdraw Application
                  </Button>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailsApplication(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Job Header */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailsApplication.job?.title || 'Position'}
                  </h3>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {detailsApplication.job?.company} • {detailsApplication.job?.location}
                  </div>
                </div>

                <Badge
                  variant={formatApplicationStatus(detailsApplication.status).variant}
                  dot
                >
                  {formatApplicationStatus(detailsApplication.status).label}
                </Badge>
              </div>

              {detailsApplication.job?._id && (
                <Link
                  to={`/jobs/${detailsApplication.job._id}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                >
                  <span>View Original Job Posting</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Status Information Box */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">Application Status Note:</div>
              <p className="text-slate-600">
                {formatApplicationStatus(detailsApplication.status).description}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                Submitted on {new Date(detailsApplication.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Status Transition History Timeline */}
            {detailsApplication.statusHistory && detailsApplication.statusHistory.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Status History Timeline:</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-200/70 max-h-36 overflow-y-auto text-xs">
                  {detailsApplication.statusHistory.map((hist, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={formatApplicationStatus(hist.status).variant} size="sm">
                            {hist.status}
                          </Badge>
                          <span className="font-medium text-slate-700">
                            {hist.changedByRole === 'candidate' ? 'You' : 'Hiring Team'}
                          </span>
                        </div>
                        {hist.note && (
                          <p className="text-[11px] text-slate-500 italic pl-0.5">
                            &ldquo;{hist.note}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(hist.changedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Resume Snapshot */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">Submitted Resume:</div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">
                      {detailsApplication.resume?.filename || 'Candidate_Resume.pdf'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Format: {detailsApplication.resume?.mimeType || 'PDF'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSnapshot}
                  isLoading={isDownloadingResume}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              </div>
            </div>

            {/* Submitted Cover Letter */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">Cover Letter:</div>
              {detailsApplication.coverLetter ? (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {detailsApplication.coverLetter}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 italic">
                  No optional cover letter was included with this application.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Withdrawal / Cancellation Confirmation Modal */}
      {withdrawingApplication && (
        <Modal
          isOpen={Boolean(withdrawingApplication)}
          onClose={() => !isWithdrawing && setWithdrawingApplication(null)}
          title="Withdraw Job Application"
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWithdrawingApplication(null)}
                disabled={isWithdrawing}
              >
                Keep Application
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleWithdrawConfirm}
                isLoading={isWithdrawing}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Yes, Withdraw Application
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Are you sure?</p>
                <p className="mt-0.5">
                  You are about to withdraw your application for{' '}
                  <strong>{withdrawingApplication.job?.title || 'this role'}</strong> at{' '}
                  <strong>{withdrawingApplication.job?.company || 'the hiring company'}</strong>.
                </p>
              </div>
            </div>
            <p>
              Once withdrawn, the recruiter will be notified that you are no longer in the running.
              You will not be able to reactivate this specific application.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
