import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import {
  getJobApplicationsApi,
  updateApplicationStatusApi,
} from '../../api/application.api';
import {
  formatDate,
  formatApplicationStatus,
} from '../../utils/jobUtils';
import {
  Users,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Submitted' },
  { value: 'reviewing', label: 'In Review' },
  { value: 'shortlisted', label: 'Shortlist' },
  { value: 'interviewing', label: 'Interview' },
  { value: 'accepted', label: 'Accept / Offer' },
  { value: 'rejected', label: 'Reject' },
];

export default function JobApplicantsModal({ isOpen, onClose, job }) {
  const toast = useToast();

  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedApplicantDetails, setSelectedApplicantDetails] = useState(null);

  const fetchApplicants = useCallback(async () => {
    if (!job?._id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getJobApplicationsApi(job._id);
      setApplicants(response.data?.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve applicants for this position.');
    } finally {
      setIsLoading(false);
    }
  }, [job?._id]);

  useEffect(() => {
    if (isOpen && job?._id) {
      fetchApplicants();
      setSelectedApplicantDetails(null);
    }
  }, [isOpen, job?._id, fetchApplicants]);

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingId(applicationId);
    try {
      await updateApplicationStatusApi(applicationId, newStatus);
      toast.success(
        `Candidate status updated to "${formatApplicationStatus(newStatus).label}".`,
        'Status Updated'
      );
      setApplicants((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: newStatus } : app
        )
      );
      if (selectedApplicantDetails?._id === applicationId) {
        setSelectedApplicantDetails((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update application status.', 'Error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Applicants for ${job?.title || 'Job Listing'}`}
      size="xl"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Job Header Bar */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <div className="text-sm font-bold text-slate-900">{job?.title}</div>
            <div className="text-slate-600">
              {job?.company} • {job?.location} • {job?.jobType}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-900 bg-blue-100/70 px-2.5 py-1 rounded-md">
              {applicants.length} Total Applicant{applicants.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="danger" size="sm" onClick={fetchApplicants}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && applicants.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h4 className="text-sm font-bold text-slate-900">No Applicants Yet</h4>
              <p className="text-xs text-slate-500">
                Candidates who apply to this active job listing will appear here in real-time.
              </p>
            </div>
          </div>
        )}

        {/* Applicants List / Table */}
        {!isLoading && !error && applicants.length > 0 && (
          <div className="space-y-3">
            {applicants.map((app) => {
              const candidate = app.candidate || {};
              const statusMeta = formatApplicationStatus(app.status);
              const isUpdating = updatingId === app._id;
              const isSelected = selectedApplicantDetails?._id === app._id;

              return (
                <div
                  key={app._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Candidate Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          {candidate.name ? candidate.name.charAt(0) : 'C'}
                        </div>
                        <div className="font-bold text-sm text-slate-900">
                          {candidate.name || 'Anonymous Candidate'}
                        </div>
                        <Badge variant={statusMeta.variant} dot size="sm">
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                        {candidate.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{candidate.email}</span>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Applied {formatDate(app.createdAt)}</span>
                        </div>
                      </div>

                      {/* Skills Tags */}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {candidate.skills.slice(0, 6).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 6 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{candidate.skills.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stage Selector & Action Details */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        variant={isSelected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSelectedApplicantDetails(isSelected ? null : app)
                        }
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                      >
                        {isSelected ? 'Hide Details' : 'View Application'}
                      </Button>

                      {/* Stage Dropdown */}
                      <div className="relative">
                        <select
                          value={app.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              Stage: {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Application Detail View (Resume Snapshot & Cover Letter) */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 bg-slate-50/70 p-3.5 rounded-lg text-xs">
                      {/* Resume snapshot info */}
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">
                          Verified Resume Snapshot:
                        </div>
                        <div className="p-2.5 rounded-md bg-white border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-900">
                              {app.resume?.filename || 'Resume_Snapshot.pdf'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({app.resume?.mimeType || 'PDF'})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Immutable snapshot saved at submission
                          </span>
                        </div>
                      </div>

                      {/* Cover letter */}
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">
                          Candidate Cover Letter:
                        </div>
                        {app.coverLetter ? (
                          <div className="p-3 rounded-md bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {app.coverLetter}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-md bg-white border border-dashed border-slate-200 text-slate-400 italic">
                            No cover letter was included by candidate.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
