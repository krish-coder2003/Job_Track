import { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button';
import { useToast } from '../common/Toast';
import { saveCriteriaApi, getCriteriaApi } from '../../api/ats.api';
import {
  Target,
  ChevronDown,
  ChevronRight,
  Info,
  Save,
  RefreshCw,
} from 'lucide-react';

const DEFAULT_WEIGHTS = { skills: 35, projects: 25, experience: 20, education: 10, keywords: 10 };

const EDUCATION_OPTIONS = [
  { value: 'any', label: 'Any / Not specified' },
  { value: 'none', label: 'None required' },
  { value: 'high-school', label: 'High School / GED' },
  { value: 'associate', label: "Associate's Degree" },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'phd', label: 'PhD / Doctorate' },
];

function TagInput({ label, helpText, value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const trimmed = draft.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !draft && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
      <div className="min-h-[42px] flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 ml-0.5">×</button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
        />
      </div>
    </div>
  );
}

export default function EvaluationCriteriaSection({ jobId, isExpanded: defaultExpanded = false }) {
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    requiredSkills: [],
    preferredSkills: [],
    minimumEducation: 'any',
    preferredEducation: '',
    minimumExperienceYears: 0,
    projectRequirements: '',
    jobDescriptionKeywords: [],
    weights: { ...DEFAULT_WEIGHTS },
  });
  const [weightsAreDefault, setWeightsAreDefault] = useState(true);

  // Load existing criteria on mount
  const loadCriteria = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const res = await getCriteriaApi(jobId);
      const c = res.data?.criteria;
      if (c) {
        setForm({
          requiredSkills: c.requiredSkills || [],
          preferredSkills: c.preferredSkills || [],
          minimumEducation: c.minimumEducation || 'any',
          preferredEducation: c.preferredEducation || '',
          minimumExperienceYears: c.minimumExperienceYears ?? 0,
          projectRequirements: c.projectRequirements || '',
          jobDescriptionKeywords: c.jobDescriptionKeywords || [],
          weights: {
            skills: c.weights?.skills ?? DEFAULT_WEIGHTS.skills,
            projects: c.weights?.projects ?? DEFAULT_WEIGHTS.projects,
            experience: c.weights?.experience ?? DEFAULT_WEIGHTS.experience,
            education: c.weights?.education ?? DEFAULT_WEIGHTS.education,
            keywords: c.weights?.keywords ?? DEFAULT_WEIGHTS.keywords,
          },
        });
        setWeightsAreDefault(c.weights?.isDefault !== false);
      }
    } catch {
      // No criteria yet — keep defaults, not an error
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (isExpanded) loadCriteria();
  }, [isExpanded, loadCriteria]);

  const totalWeight = Object.values(form.weights).reduce((a, b) => a + Number(b || 0), 0);

  const handleWeightChange = (key, val) => {
    setForm((f) => ({ ...f, weights: { ...f.weights, [key]: Number(val) || 0 } }));
    setWeightsAreDefault(false);
  };

  const resetWeights = () => {
    setForm((f) => ({ ...f, weights: { ...DEFAULT_WEIGHTS } }));
    setWeightsAreDefault(true);
  };

  const handleSave = async () => {
    if (!jobId) return;
    setIsSaving(true);
    try {
      await saveCriteriaApi(jobId, form);
      toast.success('Evaluation criteria saved.');
    } catch (err) {
      toast.error(err.message || 'Failed to save criteria.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-50 to-blue-50 hover:from-violet-100 hover:to-blue-100 transition-colors"
        id="ats-criteria-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">ATS Evaluation Criteria</p>
            <p className="text-xs text-slate-500">Define scoring criteria for automated resume matching</p>
          </div>
        </div>
        {isExpanded
          ? <ChevronDown className="w-5 h-5 text-slate-400" />
          : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 py-5 space-y-6 bg-white">

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading saved criteria…
            </div>
          )}

          {!isLoading && (
            <>
              {/* Skills */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TagInput
                  label="Required Skills"
                  helpText="Press Enter or comma to add. Candidates are penalised if these are missing."
                  value={form.requiredSkills}
                  onChange={(v) => setForm((f) => ({ ...f, requiredSkills: v }))}
                  placeholder="react, typescript, aws…"
                />
                <TagInput
                  label="Preferred Skills"
                  helpText="Nice-to-have skills. Contribute 30% of the skills category."
                  value={form.preferredSkills}
                  onChange={(v) => setForm((f) => ({ ...f, preferredSkills: v }))}
                  placeholder="graphql, docker…"
                />
              </div>

              {/* Education + Experience */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Minimum Education</label>
                  <select
                    value={form.minimumEducation}
                    onChange={(e) => setForm((f) => ({ ...f, minimumEducation: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  >
                    {EDUCATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Min. Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={form.minimumExperienceYears}
                    onChange={(e) => setForm((f) => ({ ...f, minimumExperienceYears: Number(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Preferred Education</label>
                  <input
                    type="text"
                    value={form.preferredEducation}
                    onChange={(e) => setForm((f) => ({ ...f, preferredEducation: e.target.value }))}
                    placeholder="e.g. CS degree preferred"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Project requirements */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Project Requirements</label>
                <p className="text-xs text-slate-500">Describe the types of projects candidates should have built (AI-scored).</p>
                <textarea
                  value={form.projectRequirements}
                  onChange={(e) => setForm((f) => ({ ...f, projectRequirements: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. Built and deployed production REST APIs, experience with CI/CD pipelines, contributed to open-source projects…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                />
                <p className="text-right text-[11px] text-slate-400">{form.projectRequirements.length}/1000</p>
              </div>

              {/* JD Keywords */}
              <TagInput
                label="Additional JD Keywords"
                helpText="Extra keywords from the job description for alignment scoring. Press Enter to add."
                value={form.jobDescriptionKeywords}
                onChange={(v) => setForm((f) => ({ ...f, jobDescriptionKeywords: v }))}
                placeholder="microservices, agile, kubernetes…"
              />

              {/* Weights */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Scoring Weights</p>
                    <p className="text-xs text-slate-500">
                      {weightsAreDefault ? 'Using system defaults. ' : 'Custom weights set. '}
                      Weights are normalised to 100% at scoring time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${Math.abs(totalWeight - 100) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      Total: {totalWeight.toFixed(0)}%
                    </span>
                    {!weightsAreDefault && (
                      <button
                        type="button"
                        onClick={resetWeights}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                      >
                        Reset defaults
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { key: 'skills', label: 'Skills' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'experience', label: 'Experience' },
                    { key: 'education', label: 'Education' },
                    { key: 'keywords', label: 'Keywords' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={form.weights[key]}
                          onChange={(e) => handleWeightChange(key, e.target.value)}
                          className="w-full h-9 px-2 text-sm text-center border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {Math.abs(totalWeight - 100) > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <Info className="w-3.5 h-3.5" />
                    Weights don&apos;t sum to 100% — they will be normalised automatically.
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !jobId}
                  id="ats-save-criteria-btn"
                >
                  {isSaving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Criteria</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
