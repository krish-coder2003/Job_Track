import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ArrowUpDown,
} from 'lucide-react';

export default function JobsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract state from URL query parameters
  const activeSearch = searchParams.get('search') || searchParams.get('q') || '';
  const activeLocation = searchParams.get('location') || '';
  const activeWorkMode = searchParams.get('workMode') || '';
  const activeJobType = searchParams.get('jobType') || '';
  const activeExperienceLevel = searchParams.get('experienceLevel') || '';
  const activeSortBy = searchParams.get('sortBy') || 'createdAt';
  const activeOrder = searchParams.get('order') || 'desc';
  const activePage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const activeLimit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get('limit') || searchParams.get('pageSize'), 10) || 10)
  );

  // Local input state for the search & location form
  const [searchQuery, setSearchQuery] = useState(activeSearch);
  const [locationQuery, setLocationQuery] = useState(activeLocation);

  // Synchronize inputs if URL changes externally (e.g., Back/Forward or reset)
  useEffect(() => {
    setSearchQuery(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    setLocationQuery(activeLocation);
  }, [activeLocation]);

  // Jobs data and pagination state
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: activePage,
    limit: activeLimit,
    totalPages: 1,
    hasMore: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Application modal state
  const [applyingJob, setApplyingJob] = useState(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Helper to update search params while preserving other active filters
  const updateFilters = useCallback(
    (newFilters, resetPage = true) => {
      const current = {
        search: activeSearch,
        location: activeLocation,
        workMode: activeWorkMode,
        jobType: activeJobType,
        experienceLevel: activeExperienceLevel,
        sortBy: activeSortBy,
        order: activeOrder,
        limit: activeLimit,
        page: activePage,
        ...newFilters,
      };

      if (resetPage) {
        current.page = 1;
      }

      const nextParams = new URLSearchParams();
      if (current.search.trim()) nextParams.set('search', current.search.trim());
      if (current.location.trim()) nextParams.set('location', current.location.trim());
      if (current.workMode) nextParams.set('workMode', current.workMode);
      if (current.jobType) nextParams.set('jobType', current.jobType);
      if (current.experienceLevel) nextParams.set('experienceLevel', current.experienceLevel);

      // Sorting
      if (current.sortBy && (current.sortBy !== 'createdAt' || current.order !== 'desc')) {
        nextParams.set('sortBy', current.sortBy);
        nextParams.set('order', current.order || 'desc');
      }

      // Page size
      if (current.limit && current.limit !== 10) {
        nextParams.set('limit', String(current.limit));
      }

      // Page number
      if (current.page && current.page > 1) {
        nextParams.set('page', String(current.page));
      }

      setSearchParams(nextParams, { replace: true });
    },
    [
      activeSearch,
      activeLocation,
      activeWorkMode,
      activeJobType,
      activeExperienceLevel,
      activeSortBy,
      activeOrder,
      activeLimit,
      activePage,
      setSearchParams,
    ]
  );

  // Fetch jobs from server
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const params = {
        page: activePage,
        limit: activeLimit,
      };

      if (activeSearch.trim()) params.search = activeSearch.trim();
      if (activeLocation.trim()) params.location = activeLocation.trim();
      if (activeWorkMode) params.workMode = activeWorkMode;
      if (activeJobType) params.jobType = activeJobType;
      if (activeExperienceLevel) params.experienceLevel = activeExperienceLevel;
      if (activeSortBy) params.sortBy = activeSortBy;
      if (activeOrder) params.order = activeOrder;

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
  }, [
    activePage,
    activeLimit,
    activeSearch,
    activeLocation,
    activeWorkMode,
    activeJobType,
    activeExperienceLevel,
    activeSortBy,
    activeOrder,
    toast,
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(
      {
        search: searchQuery.trim(),
        location: locationQuery.trim(),
      },
      true
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val === 'newest') {
      updateFilters({ sortBy: 'createdAt', order: 'desc' }, true);
    } else if (val === 'oldest') {
      updateFilters({ sortBy: 'createdAt', order: 'asc' }, true);
    } else if (val === 'title_asc') {
      updateFilters({ sortBy: 'title', order: 'asc' }, true);
    } else if (val === 'company_asc') {
      updateFilters({ sortBy: 'company', order: 'asc' }, true);
    }
  };

  const currentSortValue = useMemo(() => {
    if (activeSortBy === 'title' && activeOrder === 'asc') return 'title_asc';
    if (activeSortBy === 'company' && activeOrder === 'asc') return 'company_asc';
    if (activeSortBy === 'createdAt' && activeOrder === 'asc') return 'oldest';
    return 'newest';
  }, [activeSortBy, activeOrder]);

  const hasActiveFilters = Boolean(
    activeSearch ||
      activeLocation ||
      activeWorkMode ||
      activeJobType ||
      activeExperienceLevel ||
      activeSortBy !== 'createdAt' ||
      activeOrder !== 'desc' ||
      activeLimit !== 10
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

  // Calculate showing item range
  const startItem = pagination.total === 0 ? 0 : (activePage - 1) * activeLimit + 1;
  const endItem = Math.min(activePage * activeLimit, pagination.total);

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
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              {/* Keyword Search */}
              <div className="flex-1 relative">
                <Input
                  id="job-keyword-search"
                  type="text"
                  placeholder="Job title, company, skills, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="mb-0"
                />
              </div>

              {/* Location Filter */}
              <div className="flex-1 md:max-w-xs relative">
                <Input
                  id="job-location-filter"
                  type="text"
                  placeholder="Location or city..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                  className="mb-0"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  id="btn-jobs-search-submit"
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
                    id="btn-jobs-clear-all"
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
                id="select-work-mode"
                value={activeWorkMode}
                onChange={(e) => updateFilters({ workMode: e.target.value }, true)}
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
                id="select-job-type"
                value={activeJobType}
                onChange={(e) => updateFilters({ jobType: e.target.value }, true)}
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
                id="select-experience-level"
                value={activeExperienceLevel}
                onChange={(e) => updateFilters({ experienceLevel: e.target.value }, true)}
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

              {/* Sort By Dropdown */}
              <div className="flex items-center space-x-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="select-sort-order"
                  value={currentSortValue}
                  onChange={handleSortChange}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer"
                  aria-label="Sort jobs by"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="title_asc">Sort: Title (A-Z)</option>
                  <option value="company_asc">Sort: Company (A-Z)</option>
                </select>
              </div>

              {/* Page Size Dropdown */}
              <select
                id="select-page-size"
                value={activeLimit}
                onChange={(e) => updateFilters({ limit: Number(e.target.value) }, true)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer"
                aria-label="Jobs per page"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Active filters:</span>

                {activeSearch && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    <span>Keyword: &quot;{activeSearch}&quot;</span>
                    <button
                      type="button"
                      aria-label="Remove keyword filter"
                      onClick={() => {
                        setSearchQuery('');
                        updateFilters({ search: '' }, true);
                      }}
                      className="hover:text-blue-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeLocation && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    <span>Location: &quot;{activeLocation}&quot;</span>
                    <button
                      type="button"
                      aria-label="Remove location filter"
                      onClick={() => {
                        setLocationQuery('');
                        updateFilters({ location: '' }, true);
                      }}
                      className="hover:text-blue-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeWorkMode && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    <span className="capitalize">{activeWorkMode}</span>
                    <button
                      type="button"
                      aria-label="Remove work mode filter"
                      onClick={() => updateFilters({ workMode: '' }, true)}
                      className="hover:text-blue-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeJobType && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    <span className="capitalize">{activeJobType}</span>
                    <button
                      type="button"
                      aria-label="Remove job type filter"
                      onClick={() => updateFilters({ jobType: '' }, true)}
                      className="hover:text-blue-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeExperienceLevel && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    <span className="capitalize">{activeExperienceLevel} level</span>
                    <button
                      type="button"
                      aria-label="Remove experience level filter"
                      onClick={() => updateFilters({ experienceLevel: '' }, true)}
                      className="hover:text-blue-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(activeSortBy !== 'createdAt' || activeOrder !== 'desc') && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                    <span>
                      Sorted by: {activeSortBy === 'title' ? 'Title (A-Z)' : activeSortBy === 'company' ? 'Company (A-Z)' : 'Oldest'}
                    </span>
                    <button
                      type="button"
                      aria-label="Reset sorting to newest first"
                      onClick={() => updateFilters({ sortBy: 'createdAt', order: 'desc' }, true)}
                      className="hover:text-slate-900 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1 font-semibold"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Results Metadata Bar */}
          {!isLoading && !apiError && pagination.total > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
              <div>
                Showing <strong className="text-slate-900 font-semibold">{startItem}</strong> to{' '}
                <strong className="text-slate-900 font-semibold">{endItem}</strong> of{' '}
                <strong className="text-slate-900 font-semibold">{pagination.total}</strong> results
              </div>

              <div>
                Page <strong className="text-slate-900 font-semibold">{pagination.page}</strong> of{' '}
                <strong className="text-slate-900 font-semibold">{pagination.totalPages}</strong>
              </div>
            </div>
          )}

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
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 border-t border-slate-200 mt-8">
              <div>
                Showing page <strong className="font-bold text-slate-900">{pagination.page}</strong> of{' '}
                <strong className="font-bold text-slate-900">{pagination.totalPages}</strong> (
                {pagination.total} total jobs)
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  id="btn-jobs-prev-page"
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: activePage - 1 }, false)}
                  disabled={activePage <= 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>

                {/* Numbered Page Buttons for Quick Jump */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, and pages adjacent to current page
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - activePage) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;

                      return (
                        <span key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1 text-slate-400 select-none">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => updateFilters({ page: p }, false)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              activePage === p
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}
                </div>

                <Button
                  id="btn-jobs-next-page"
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: activePage + 1 }, false)}
                  disabled={activePage >= pagination.totalPages}
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
