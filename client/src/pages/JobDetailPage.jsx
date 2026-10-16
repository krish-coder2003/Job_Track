import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageContainer from '../components/common/PageContainer';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Modal from '../components/common/Modal';
import { Skeleton } from '../components/common/LoadingIndicator';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { getJobByIdApi } from '../api/job.api';
import {
  formatSalary,
  formatJobType,
  formatWorkMode,
  formatExperienceLevel,
  formatDate,
} from '../utils/jobUtils';
import {
  Building2,
  MapPin,
  Clock,
  Banknote,
  Send,
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Share2,
} from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isCandidate } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Application modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getJobByIdApi(id);
      setJob(response.data?.job || null);

      // Check URL query param ?apply=true
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('apply') === 'true') {
        setApplyModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Job vacancy not found or is no longer active.');
    } finally {
      setIsLoading(false);
    }
  }, [id, location.search]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in or create an account to apply for this job.', 'Sign In Required');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!isCandidate) {
      toast.warning('Recruiter and Admin accounts cannot submit candidate applications.', 'Candidate Account Required');
      return;
    }

    setApplyModalOpen(true);
  };

  const handleConfirmApplication = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setApplyModalOpen(false);
      setHasApplied(true);
      toast.success(
        `Your application for ${job.title} has been submitted!`,
        'Application Sent'
      );
    }, 1200);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.info('Job link copied to clipboard.', 'Link Copied');
  };

  const formattedSalary = job ? formatSalary(job.salary) : null;
  const isOwner = user && job && job.recruiter && (job.recruiter._id === user._id || job.recruiter === user._id);
  const isActive = job?.status === 'active';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <PageContainer>
          {/* Back link */}
          <div className="mb-6">
            <Link
              to="/jobs"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to all vacancies</span>
            </Link>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
          )}

          {/* Error / 404 State */}
          {!isLoading && (error || !job) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">
                  Vacancy Not Available
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {error || 'This job listing may have expired, been closed by the recruiter, or does not exist.'}
                </p>
              </div>
              <Link to="/jobs">
                <Button variant="primary" size="md" leftIcon={<Briefcase className="w-4 h-4" />}>
                  Explore Active Vacancies
                </Button>
              </Link>
            </div>
          )}

          {/* Job Detail Content */}
          {!isLoading && job && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Header Card */}
                <Card variant="elevated">
                  <CardContent className="p-6 sm:p-8 space-y-5">
                    {/* Company & Posted Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center space-x-2 font-semibold text-slate-800 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span>{job.company}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {job.title}
                      </h1>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{job.location}</span>
                      </div>
                    </div>

                    {/* Badges & Conditional Salary */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
                      <Badge variant="navy">{formatJobType(job.jobType)}</Badge>
                      <Badge variant="gray">{formatExperienceLevel(job.experienceLevel)}</Badge>

                      {/* ONLY rendered when salary information exists */}
                      {formattedSalary && (
                        <span className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>{formattedSalary}</span>
                        </span>
                      )}

                      {!isActive && (
                        <Badge variant="warning" dot>
                          {job.status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Inactive Notice */}
                {!isActive && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-xs text-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">This job vacancy is currently marked as {job.status}.</p>
                      <p className="mt-0.5 text-amber-700">
                        Applications are temporarily suspended. Only the owner recruiter can view or modify this listing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Job Description */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="text-lg">Role Overview & Description</CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.description}
                  </CardContent>
                </Card>

                {/* Key Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <Card variant="default">
                    <CardHeader>
                      <CardTitle className="text-lg">Core Responsibilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2.5 text-sm text-slate-700">
                        {job.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Required Skills */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <Card variant="default">
                    <CardHeader>
                      <CardTitle className="text-lg">Required Qualifications & Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar Action Column */}
              <div className="space-y-6">
                {/* Apply Box */}
                <Card variant="elevated" className="border-blue-100">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Interested in this role?
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Submit your verified profile to the {job.company} hiring team.
                      </p>
                    </div>

                    {/* Apply Button */}
                    {hasApplied ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Application Submitted</span>
                      </div>
                    ) : isOwner ? (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 font-medium">
                          You are the author of this listing.
                        </div>
                        <Link to="/dashboard" className="block">
                          <Button variant="outline" size="md" className="w-full justify-center">
                            Manage in Workspace
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleApplyClick}
                        disabled={!isActive}
                        leftIcon={<Send className="w-4 h-4" />}
                        className="w-full justify-center shadow-xs"
                      >
                        {isActive ? 'Apply for Position' : 'Applications Closed'}
                      </Button>
                    )}

                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={handleShare}
                      leftIcon={<Share2 className="w-3.5 h-3.5" />}
                      className="w-full justify-center"
                    >
                      Share this Opportunity
                    </Button>
                  </CardContent>
                </Card>

                {/* Job Overview Metadata */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="text-sm">Position Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Employment Type</span>
                      <span className="font-semibold text-slate-800 capitalize">{job.jobType}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Work Arrangement</span>
                      <span className="font-semibold text-slate-800 capitalize">{job.workMode}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Experience Tier</span>
                      <span className="font-semibold text-slate-800 capitalize">{job.experienceLevel}</span>
                    </div>

                    {formattedSalary && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Compensation</span>
                        <span className="font-bold text-emerald-700">{formattedSalary}</span>
                      </div>
                    )}

                    {job.applicationDeadline && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Deadline</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {new Date(job.applicationDeadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recruiter / Company Information */}
                {job.recruiter && typeof job.recruiter === 'object' && (
                  <Card variant="default">
                    <CardHeader>
                      <CardTitle className="text-sm">Posted By Hiring Team</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {job.recruiter.name?.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{job.recruiter.name}</div>
                          <div className="text-slate-500">Verified Recruiter</div>
                        </div>
                      </div>
                      <div className="pt-2 text-[11px] text-slate-400 flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Identity verified through JobTrack ATS</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </PageContainer>
      </main>

      {/* Application Dialog Modal */}
      {job && (
        <Modal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          title={`Apply for ${job.title}`}
          description={`Submit your verified credentials to ${job.company}`}
          size="md"
          footer={
            <>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setApplyModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmApplication}
                isLoading={isSubmitting}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Confirm Application
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1 text-xs">
              <div className="text-sm font-bold text-slate-900">{job.title}</div>
              <div className="text-slate-600">{job.company} • {job.location}</div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">Your Application Summary:</div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-700">{user.phone}</span>
                  </div>
                )}
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
                Your candidate profile and verified resume will be shared with the recruiter immediately.
              </span>
            </div>
          </div>
        </Modal>
      )}

      <Footer />
    </div>
  );
}
