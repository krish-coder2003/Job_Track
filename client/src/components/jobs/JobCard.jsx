import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Card, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  formatSalary,
  formatJobType,
  formatWorkMode,
  formatExperienceLevel,
  formatDate,
} from '../../utils/jobUtils';
import {
  Building2,
  MapPin,
  Clock,
  Banknote,
  Send,
  ArrowRight,
} from 'lucide-react';

export default function JobCard({ job, onApply }) {
  const { user, isAuthenticated, isCandidate } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const formattedSalary = formatSalary(job.salary);
  const isOwner = user && job.recruiter && (job.recruiter._id === user._id || job.recruiter === user._id);

  const handleApplyClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please sign in or create an account to apply for this job.', 'Sign In Required');
      navigate('/login', {
        state: { from: { pathname: `/jobs/${job._id}` } },
      });
      return;
    }

    if (!isCandidate) {
      toast.warning('Recruiter and Admin accounts cannot submit candidate applications.', 'Candidate Account Required');
      return;
    }

    if (onApply) {
      onApply(job);
    } else {
      navigate(`/jobs/${job._id}?apply=true`);
    }
  };

  const getWorkModeBadgeVariant = (mode) => {
    switch (mode) {
      case 'remote':
        return 'success';
      case 'hybrid':
        return 'blue';
      case 'on-site':
      default:
        return 'gray';
    }
  };

  return (
    <Card
      variant="default"
      className="hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Main Info */}
          <div className="space-y-3 flex-1 min-w-0">
            {/* Header: Company & Posted Date */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-2 font-medium text-slate-700 truncate">
                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{job.company}</span>
              </div>

              <div className="flex items-center space-x-1 shrink-0 text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{formatDate(job.createdAt)}</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <Link to={`/jobs/${job._id}`} className="block group-hover:text-blue-600 transition-colors">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {job.title}
                </h3>
              </Link>

              {/* Location */}
              <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>
            </div>

            {/* Badges row: JobType, WorkMode, Experience, Salary (conditional) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant={getWorkModeBadgeVariant(job.workMode)} size="sm">
                {formatWorkMode(job.workMode)}
              </Badge>

              <Badge variant="navy" size="sm">
                {formatJobType(job.jobType)}
              </Badge>

              <Badge variant="gray" size="sm">
                {formatExperienceLevel(job.experienceLevel)}
              </Badge>

              {/* ONLY rendered when salary information exists */}
              {formattedSalary && (
                <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formattedSalary}</span>
                </span>
              )}
            </div>

            {/* Description Snippet */}
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {job.description}
            </p>

            {/* Skills chips */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {job.requiredSkills.slice(0, 5).map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                  >
                    {skill}
                  </span>
                ))}
                {job.requiredSkills.length > 5 && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    +{job.requiredSkills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
            {isOwner ? (
              <Link to={`/jobs/${job._id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Manage Listing
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyClick}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto shadow-xs"
              >
                Apply Now
              </Button>
            )}

            <Link to={`/jobs/${job._id}`} className="w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />}
                className="w-full sm:w-auto text-slate-600 hover:text-blue-600"
              >
                Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

JobCard.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    jobType: PropTypes.string.isRequired,
    workMode: PropTypes.string.isRequired,
    experienceLevel: PropTypes.string.isRequired,
    salary: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number,
      currency: PropTypes.string,
      period: PropTypes.string,
    }),
    requiredSkills: PropTypes.arrayOf(PropTypes.string),
    createdAt: PropTypes.string,
    recruiter: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
      }),
    ]),
  }).isRequired,
  onApply: PropTypes.func,
};
