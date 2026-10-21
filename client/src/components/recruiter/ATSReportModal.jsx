import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Skeleton } from '../common/LoadingIndicator';
import { useToast } from '../common/Toast';
import { requestATSReportApi, getATSReportApi } from '../../api/ats.api';
import { formatDate } from '../../utils/jobUtils';
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
  FileText,
  Target,
  BookOpen,
  Briefcase,
  Code,
} from 'lucide-react';

// ─── Score ring component ─────────────────────────────────────────────────────

function ScoreRing({ score, size = 88, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circumference - (safeScore / 100) * circumference;

  const color =
    safeScore >= 75 ? '#10b981' : // emerald
    safeScore >= 50 ? '#f59e0b' : // amber
    '#ef4444';                    // rose

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>
        {safeScore}
      </span>
    </div>
  );
}

// ─── Category bar ─────────────────────────────────────────────────────────────

function CategoryBar({ label, score, weight, icon: Icon }) {
  const pct = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const barColor =
    pct >= 75 ? 'bg-emerald-500' :
    pct >= 50 ? 'bg-amber-500' :
    'bg-rose-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
          <span className="text-slate-400 font-normal">({weight?.toFixed(0)}%)</span>
        </span>
        <span className="font-bold text-slate-800">{pct}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Evidence section ─────────────────────────────────────────────────────────

function EvidenceSection({ title, matched = [], missing = [], evidence = [], note }) {
  const [open, setOpen] = useState(false);
  if (!matched.length && !missing.length && !evidence.length) return null;

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {note && (
            <p className="text-xs text-slate-500 italic">{note}</p>
          )}

          {matched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">✓ Matched</p>
              <div className="flex flex-wrap gap-1.5">
                {matched.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missing.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-rose-600 mb-1.5">✗ Missing / Unverified</p>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md font-medium">
                    <XCircle className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Resume evidence</p>
              <div className="space-y-1.5">
                {evidence.map((ev, i) => (
                  <blockquote key={i} className="text-[11px] text-slate-600 bg-slate-50 border-l-2 border-slate-300 pl-3 py-1.5 italic rounded-r-md">
                    {ev}
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    completed: <Badge variant="success" dot>Complete</Badge>,
    processing: <Badge variant="warning" dot>Processing…</Badge>,
    pending: <Badge variant="gray" dot>Pending</Badge>,
    failed: <Badge variant="danger" dot>Failed</Badge>,
    unavailable: <Badge variant="gray" dot>No Resume</Badge>,
  };
  return map[status] || <Badge variant="gray">{status}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ATSReportModal({ isOpen, onClose, application }) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const applicationId = application?._id;

  // Load existing report on open
  const loadReport = useCallback(async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getATSReportApi(applicationId);
      setReport(res.data?.report || null);
    } catch (err) {
      if (err.status === 404) {
        setReport(null); // No report yet
      } else {
        setError(err.message || 'Failed to load ATS report.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (isOpen) loadReport();
  }, [isOpen, loadReport]);

  // Run / reprocess ATS analysis
  const handleAnalyse = useCallback(async (forceReprocess = false) => {
    if (!applicationId) return;
    setIsRequesting(true);
    setError(null);
    try {
      const res = await requestATSReportApi(applicationId, forceReprocess);
      setReport(res.data?.report || null);
      if (res.data?.report?.status === 'completed') {
        toast.success('ATS analysis complete.');
      } else if (res.data?.report?.status === 'failed') {
        toast.error('ATS analysis failed. See error details below.');
      } else if (res.data?.report?.status === 'unavailable') {
        toast.error('Candidate has no resume on file.');
      }
    } catch (err) {
      setError(err.message || 'Failed to run ATS analysis.');
      toast.error(err.message || 'ATS analysis failed.');
    } finally {
      setIsRequesting(false);
    }
  }, [applicationId, toast]);

  const cs = report?.categoryScores || {};
  const hasScore = report?.status === 'completed' && report?.overallScore != null;

  const CATEGORY_CONFIG = [
    { key: 'skills',     label: 'Skills Match',   icon: Code },
    { key: 'projects',   label: 'Projects',        icon: Target },
    { key: 'experience', label: 'Experience',      icon: Briefcase },
    { key: 'education',  label: 'Education',       icon: BookOpen },
    { key: 'keywords',   label: 'JD Alignment',    icon: FileText },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ATS Resume Analysis"
      description={`Evaluation for ${application?.candidate?.name || 'candidate'} — ${application?.job?.title || 'position'}`}
      size="xl"
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Error loading report</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* No report yet */}
      {!isLoading && !error && !report && (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No ATS analysis yet</p>
            <p className="text-sm text-slate-500 mt-1">Click below to analyse this candidate&apos;s resume against your job criteria.</p>
          </div>
          <Button
            onClick={() => handleAnalyse(false)}
            disabled={isRequesting}
            id="ats-run-analysis-btn"
          >
            {isRequesting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analysing…</>
            ) : (
              <><Brain className="w-4 h-4" /> Run ATS Analysis</>
            )}
          </Button>
        </div>
      )}

      {/* Report available */}
      {!isLoading && !error && report && (
        <div className="space-y-5">
          {/* Header row: status + score */}
          <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {statusBadge(report.status)}
                {report.aiAssisted && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-md font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> AI-Assisted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {report.processingCompletedAt
                  ? `Analysed ${formatDate(report.processingCompletedAt)}`
                  : 'Not yet processed'}
                {' · '}v{report.scoringVersion || '1.0'}
              </p>
              {report.errorMessage && (
                <p className="text-xs text-rose-600 mt-1">{report.errorMessage}</p>
              )}
            </div>

            {hasScore && (
              <div className="text-center shrink-0">
                <ScoreRing score={report.overallScore} />
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Overall Score</p>
              </div>
            )}
          </div>

          {/* AI fairness notice */}
          {report.aiAssisted && (
            <div className="flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-violet-700 leading-relaxed">
                <strong>AI-assisted scoring:</strong> Project relevance and JD alignment scores were generated by a language model.
                These scores are decision-support signals — not definitive measures of candidate quality.
                Please review the resume and evidence excerpts before making hiring decisions.
              </p>
            </div>
          )}

          {/* AI explanation */}
          {hasScore && report.explanation && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Score Explanation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{report.explanation}</p>
            </div>
          )}

          {/* Category scores */}
          {hasScore && (
            <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">Category Breakdown</p>
              {CATEGORY_CONFIG.map(({ key, label, icon }) => {
                const cat = cs[key];
                if (!cat) return null;
                return (
                  <CategoryBar
                    key={key}
                    label={label}
                    score={cat.score}
                    weight={cat.weight}
                    icon={icon}
                  />
                );
              })}
            </div>
          )}

          {/* Evidence sections (collapsed by default) */}
          {hasScore && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details & Evidence</p>
              {CATEGORY_CONFIG.map(({ key, label }) => {
                const cat = cs[key];
                if (!cat) return null;
                return (
                  <EvidenceSection
                    key={key}
                    title={label}
                    matched={cat.matched || []}
                    missing={cat.missing || []}
                    evidence={cat.evidence || []}
                    note={cat.note}
                  />
                );
              })}
            </div>
          )}

          {/* Criteria snapshot summary */}
          {report.criteriaSnapshot && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2">Criteria Used for This Report</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Required skills: <strong>{(report.criteriaSnapshot.requiredSkills || []).join(', ') || '—'}</strong></div>
                <div>Min experience: <strong>{report.criteriaSnapshot.minimumExperienceYears || 0} yr(s)</strong></div>
                <div>Min education: <strong>{report.criteriaSnapshot.minimumEducation || 'any'}</strong></div>
                <div>Preferred skills: <strong>{(report.criteriaSnapshot.preferredSkills || []).join(', ') || '—'}</strong></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                This snapshot is locked to this analysis run. Changes to criteria will only affect new analyses.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Scores reflect resume content only — not interviews or references.
            </p>
            <div className="flex gap-2">
              {(report.status === 'failed' || report.status === 'completed') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyse(true)}
                  disabled={isRequesting}
                  id="ats-reprocess-btn"
                >
                  {isRequesting
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                    : <><RefreshCw className="w-3.5 h-3.5" /> Re-analyse</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing state — shown when report is in progress */}
      {!isLoading && !error && report?.status === 'processing' && (
        <div className="text-center py-8 space-y-3">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-700">Analysis in progress…</p>
          <p className="text-xs text-slate-500">This may take a few seconds. Refresh to check.</p>
          <Button variant="outline" size="sm" onClick={loadReport} id="ats-refresh-btn">
            <RefreshCw className="w-3.5 h-3.5" /> Check Status
          </Button>
        </div>
      )}
    </Modal>
  );
}
