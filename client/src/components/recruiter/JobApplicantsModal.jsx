import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import ATSReportModal from './ATSReportModal';
import { getJobATSReportsApi } from '../../api/ats.api';
import {
  getJobApplicationsApi,
  updateApplicationStatusApi,
  addApplicationNoteApi,
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
  AlertCircle,
  Clock,
  Search,
  MessageSquare,
  Lock,
  Plus,
  History,
  Brain,
} from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Applicants' },
  { id: 'pending', label: 'Submitted' },
  { id: 'reviewing', label: 'In Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interviewing', label: 'Interview' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Submitted / Pending' },
  { value: 'reviewing', label: 'In Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'accepted', label: 'Accepted / Offered' },
  { value: 'rejected', label: 'Rejected' },
];

export default function JobApplicantsModal({ isOpen, onClose, job }) {
  const toast = useToast();

  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected applicant for detailed inspection
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Status updating state
  const [updatingId, setUpdatingId] = useState(null);
  const [statusNote, setStatusNote] = useState('');

  // Internal notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // ATS report state
  const [atsApplication, setAtsApplication] = useState(null); // application open in ATSReportModal
  const [atsReports, setAtsReports] = useState({}); // map applicationId → report summary

  // Fetch applicants for this job
  const fetchApplicants = useCallback(async () => {
    if (!job?._id) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await getJobApplicationsApi(job._id, params);
      const list = response.data?.applications || [];
      setApplicants(list);

      // Keep selected applicant up to date without triggering dependency cycles
      setSelectedApplicant((prev) => {
        if (!prev) return null;
        return list.find((a) => a._id === prev._id) || null;
      });
    } catch (err) {
      setError(err.message || 'Failed to retrieve applicants for this position.');
    } finally {
      setIsLoading(false);
    }
  }, [job?._id, statusFilter, searchQuery]);

  // Fetch ATS score summaries for the job
  const fetchAtsReports = useCallback(async () => {
    if (!job?._id) return;
    try {
      const res = await getJobATSReportsApi(job._id);
      setAtsReports(res.data?.reports || {});
    } catch {
      // Non-fatal — ATS scores are supplementary
    }
  }, [job?._id]);

  useEffect(() => {
    if (isOpen && job?._id) {
      fetchApplicants();
      fetchAtsReports();
    } else if (!isOpen) {
      setSelectedApplicant(null);
      setStatusFilter('all');
      setSearchQuery('');
      setAtsReports({});
    }
  }, [isOpen, job?._id, fetchApplicants, fetchAtsReports]);

  // Handle stage/status update with transition validation
  const handleStatusChange = async (applicationId, newStatus, optionalNote = '') => {
    setUpdatingId(applicationId);
    try {
      const response = await updateApplicationStatusApi(
        applicationId,
        newStatus,
        optionalNote || statusNote
      );
      toast.success(
        `Candidate status updated to "${formatApplicationStatus(newStatus).label}".`,
        'Status Updated'
      );

      const updatedApp = response.data?.application;

      setApplicants((prev) =>
        prev.map((app) => (app._id === applicationId ? updatedApp || { ...app, status: newStatus } : app))
      );

      if (selectedApplicant?._id === applicationId) {
        setSelectedApplicant(updatedApp || { ...selectedApplicant, status: newStatus });
      }
      setStatusNote('');
    } catch (err) {
      toast.error(err.message || 'Failed to update application status.', 'Transition Error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle adding a private internal recruiter note
  const handleAddNote = async (applicationId) => {
    if (!newNoteText.trim()) {
      toast.error('Note text cannot be empty.', 'Validation Error');
      return;
    }

    setIsAddingNote(true);
    try {
      const response = await addApplicationNoteApi(applicationId, newNoteText.trim());
      toast.success('Internal note added successfully.', 'Note Saved');

      const updatedApp = response.data?.application;
      if (updatedApp) {
        setApplicants((prev) =>
          prev.map((app) => (app._id === applicationId ? updatedApp : app))
        );
        setSelectedApplicant(updatedApp);
      }
      setNewNoteText('');
    } catch (err) {
      toast.error(err.message || 'Failed to add internal note.', 'Note Error');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Applicant Management • ${job?.title || 'Job Listing'}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Recruiter internal notes & pipeline controls are private and secured.</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Job Summary Banner */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <div className="text-sm font-bold text-slate-900">{job?.title}</div>
            <div className="text-slate-600">
              {job?.company} • {job?.location} • <span className="capitalize">{job?.jobType}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-900 bg-blue-100/70 px-2.5 py-1 rounded-md">
              {applicants.length} Applicant{applicants.length === 1 ? '' : 's'}
            </span>
            <Badge variant={job?.status === 'active' ? 'success' : 'gray'} dot size="sm">
              {job?.status}
            </Badge>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800"
              />
            </div>

            {/* Total Filtered Count */}
            <div className="text-xs text-slate-500 self-end sm:self-center">
              Showing <strong>{applicants.length}</strong> matching candidates
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {STATUS_FILTERS.map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
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
              <h4 className="text-sm font-bold text-slate-900">No Applicants Found</h4>
              <p className="text-xs text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'No candidates match the specified status or search filter.'
                  : 'Candidates who apply to this active job listing will appear here in real-time.'}
              </p>
            </div>
          </div>
        )}

        {/* Applicants List & Detail View */}
        {!isLoading && !error && applicants.length > 0 && (
          <div className="space-y-3">
            {applicants.map((app) => {
              const candidate = app.candidate || {};
              const statusMeta = formatApplicationStatus(app.status);
              const isUpdating = updatingId === app._id;
              const isSelected = selectedApplicant?._id === app._id;
              const notesCount = app.notes?.length || 0;
              const historyCount = app.statusHistory?.length || 0;

              return (
                <div
                  key={app._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Summary Row */}
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

                        {/* Internal notes indicator */}
                        {notesCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            <MessageSquare className="w-3 h-3" />
                            <span>{notesCount} note{notesCount === 1 ? '' : 's'}</span>
                          </span>
                        )}
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

                      {/* Candidate Skills */}
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

                    {/* Status Controls & Candidate Details Toggle */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                      {/* ATS score badge + button */}
                      {(() => {
                        const atsReport = atsReports[app._id];
                        if (atsReport?.status === 'completed' && atsReport.overallScore != null) {
                          const s = atsReport.overallScore;
                          const color = s >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : s >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-rose-700 bg-rose-50 border-rose-200';
                          return (
                            <button
                              type="button"
                              onClick={() => setAtsApplication(app)}
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 border rounded-lg ${color} hover:opacity-80 transition-opacity`}
                              title="View ATS report"
                            >
                              <Brain className="w-3 h-3" />
                              ATS {s}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => setAtsApplication(app)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 border border-violet-200 text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                            title="Run ATS analysis"
                          >
                            <Brain className="w-3 h-3" />
                            ATS
                          </button>
                        );
                      })()}

                      <Button
                        variant={isSelected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedApplicant(isSelected ? null : app)}
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                      >
                        {isSelected ? 'Hide Details' : 'Review Candidate'}
                      </Button>

                      {/* Status Control Dropdown */}
                      <div className="relative">
                        <select
                          value={app.status}
                          disabled={isUpdating || app.status === 'withdrawn' || app.status === 'cancelled'}
                          onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              Stage: {opt.label}
                            </option>
                          ))}
                          {(app.status === 'withdrawn' || app.status === 'cancelled') && (
                            <option value={app.status} disabled>
                              Stage: {app.status === 'withdrawn' ? 'Withdrawn' : 'Cancelled'}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Candidate Details View */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 bg-slate-50/70 p-4 rounded-xl text-xs">
                      {/* 1. Resume Snapshot Information */}
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Verified Resume Snapshot:</span>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {app.resume?.filename || 'Resume_Snapshot.pdf'}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Format: {app.resume?.mimeType || 'PDF'} • Stored securely
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Submitted: {formatDate(app.resume?.uploadedAt || app.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Cover Letter */}
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-800">Candidate Cover Letter:</div>
                        {app.coverLetter ? (
                          <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                            {app.coverLetter}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-white border border-dashed border-slate-200 text-slate-400 italic">
                            No cover letter was included with this application.
                          </div>
                        )}
                      </div>

                      {/* 3. Status History Timeline */}
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-blue-600" />
                          <span>Status Transition History ({historyCount}):</span>
                        </div>
                        {app.statusHistory && app.statusHistory.length > 0 ? (
                          <div className="p-3 rounded-lg bg-white border border-slate-200 divide-y divide-slate-100 max-h-44 overflow-y-auto">
                            {app.statusHistory.map((hist, idx) => (
                              <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={formatApplicationStatus(hist.status).variant} size="sm">
                                      {hist.status}
                                    </Badge>
                                    <span className="font-medium text-slate-700">
                                      by {hist.changedByName || hist.changedByRole || 'System'}
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
                        ) : (
                          <div className="p-2.5 rounded-lg bg-white border border-dashed border-slate-200 text-slate-400 italic">
                            Initial submission recorded.
                          </div>
                        )}
                      </div>

                      {/* 4. Private Internal Recruiter Notes */}
                      <div className="space-y-2 p-3.5 rounded-lg bg-amber-50/40 border border-amber-200/80">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Private Internal Notes ({notesCount})</span>
                          </div>
                          <span className="text-[10px] text-amber-700 font-medium">
                            Strictly hidden from candidates
                          </span>
                        </div>

                        {/* List of existing notes */}
                        {notesCount > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {app.notes.map((note, idx) => (
                              <div
                                key={note._id || idx}
                                className="p-2.5 rounded-lg bg-white border border-amber-100 text-slate-700 space-y-1 shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-900">
                                    {note.authorName || 'Recruiter'}
                                  </span>
                                  <span className="text-slate-400">
                                    {new Date(note.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-slate-600 whitespace-pre-wrap">{note.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            No internal notes added yet. Use the field below to document interviewer feedback or internal ratings.
                          </p>
                        )}

                        {/* Add note input form */}
                        <div className="pt-2 space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Add a private note about this applicant (e.g., strong system design skills, follow up on references)..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 resize-none"
                          />
                          <div className="flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddNote(app._id)}
                              isLoading={isAddingNote}
                              disabled={!newNoteText.trim()}
                              leftIcon={<Plus className="w-3.5 h-3.5" />}
                            >
                              Add Private Note
                            </Button>
                          </div>
                        </div>
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

    {/* ATS Report Modal — rendered outside the main Modal to avoid nesting */}
    {atsApplication && (
      <ATSReportModal
        isOpen={Boolean(atsApplication)}
        onClose={() => {
          setAtsApplication(null);
          fetchAtsReports(); // Refresh score badges after analysis
        }}
        application={atsApplication}
      />
    )}
    </>
  );
}
