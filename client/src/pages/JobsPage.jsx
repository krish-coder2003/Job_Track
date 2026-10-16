import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageContainer from '../components/common/PageContainer';
import JobCard from '../components/jobs/JobCard';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { Skeleton } from '../components/common/LoadingIndicator';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { getJobsApi } from '../api/job.api';
import {
  Search,
  Briefcase,
  X,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  Building2,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export default function JobsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [jobType, setJobType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [page, setPage] = useState(1);

  // Application modal state
  const [applyingJob, setApplyingJob] = useState(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const params = {
        page,
        limit: 10,
      };

      if (activeSearch.trim()) params.search = activeSearch.trim();
      if (workMode) params.workMode = workMode;
      if (jobType) params.jobType = jobType;
      if (experienceLevel) params.experienceLevel = experienceLevel;

      const response = await getJobsApi(params);
      setJobs(response.data?.jobs || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      const message = err.message || 'Failed to fetch job vacancies.';
      setApiError(message);
      toast.error(message, 'Fetch Error');
    } finally {
      setIsLoading(false);
    }
  }, [page, activeSearch, workMode, jobType, experienceLevel, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveSearch('');
    setWorkMode('');
    setJobType('');
    setExperienceLevel('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    activeSearch || workMode || jobType || experienceLevel
  );

  const handleApply = (job) => {
    setApplyingJob(job);
  };

  const handleConfirmApplication = () => {
    setIsSubmittingApp(true);
    setTimeout(() => {
      setIsSubmittingApp(false);
      setApplyingJob(null);
      toast.success(
        `Your application for ${applyingJob.title} at ${applyingJob.company} has been received!`,
        'Application Submitted'
      );
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 py-6 sm:py-10">
        <PageContainer
          title="Explore Career Opportunities"
          subtitle="Discover verified openings across top engineering, design, and management teams. Only active and approved positions are displayed."
          badge={
            <Badge variant="blue" dot>
              {pagination.total} Active Vacancies
            </Badge>
          }
        >
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 mb-8 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search by job title, company name, skill, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="mb-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Search className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Search
                </Button>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleClearFilters}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
                    title="Reset all filters"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>

            {/* Filter Dropdowns Row */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Work Mode */}
              <select
                value={workMode}
                onChange={(e) => {
                  setWorkMode(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer"
                aria-label="Filter by work mode"
              >
                <option value="">All Work Modes</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>

              {/* Job Type */}
              <select
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer"
                aria-label="Filter by job type"
              >
                <option value="">All Job Types</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>

              {/* Experience Level */}
              <select
                value={experienceLevel}
                onChange={(e) => {
                  setExperienceLevel(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer"
                aria-label="Filter by experience level"
              >
                <option value="">All Experience Levels</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead / Principal</option>
                <option value="executive">Executive</option>
              </select>

              {/* Active Filter Tags */}
              {hasActiveFilters && (
                <div className="flex items-center gap-1.5 ml-auto">
                  {activeSearch && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                      <span>Keyword: {activeSearch}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-blue-900"
                        onClick={() => {
                          setActiveSearch('');
                          setSearchQuery('');
                        }}
                      />
                    </span>
                  )}
                  {workMode && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                      <span className="capitalize">{workMode}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-blue-900"
                        onClick={() => setWorkMode('')}
                      />
                    </span>
                  )}
                  {jobType && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                      <span className="capitalize">{jobType}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-blue-900"
                        onClick={() => setJobType('')}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error State */}
          {apiError && (
            <div
              role="alert"
              className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between text-sm text-red-700"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900">Failed to load vacancies</h4>
                  <p className="mt-0.5 text-xs text-red-600">{apiError}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={fetchJobs}>
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !apiError && jobs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  No matching vacancies found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? 'No active jobs match your search parameters. Try broadening your keywords or clearing the filters.'
                    : 'There are currently no active job listings available. Please check back later.'}
                </p>
              </div>

              {hasActiveFilters && (
                <Button variant="primary" size="sm" onClick={handleClearFilters}>
                  Clear Search Filters
                </Button>
              )}
            </div>
          )}

          {/* Job Listings Cards List */}
          {!isLoading && !apiError && jobs.length > 0 && (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard key={job._id} job={job} onApply={handleApply} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="pt-8 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 mt-8">
              <div>
                Showing page <strong className="font-bold text-slate-900">{pagination.page}</strong> of{' '}
                <strong className="font-bold text-slate-900">{pagination.totalPages}</strong> (
                {pagination.total} total jobs)
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </PageContainer>
      </main>

      {/* Candidate Apply Confirmation Modal */}
      {applyingJob && (
        <Modal
          isOpen={Boolean(applyingJob)}
          onClose={() => setApplyingJob(null)}
          title={`Apply for ${applyingJob.title}`}
          description={`Submit your candidate profile to ${applyingJob.company}`}
          size="md"
          footer={
            <>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setApplyingJob(null)}
                disabled={isSubmittingApp}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmApplication}
                isLoading={isSubmittingApp}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Application
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
              <div className="text-sm font-bold text-slate-900">{applyingJob.title}</div>
              <div className="flex items-center space-x-3 text-xs text-slate-600">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{applyingJob.company}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{applyingJob.location}</span>
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">Your Applicant Profile:</div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant Name:</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{user?.email}</span>
                </div>
                {user?.location && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-700">{user.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2 text-[11px] text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                By applying, your JobTrack profile details and verified skills will be shared directly with the recruiter hiring team.
              </span>
            </div>
          </div>
        </Modal>
      )}

      <Footer />
    </div>
  );
}
