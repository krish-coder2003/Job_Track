import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { useToast } from '../common/Toast';
import { createJobApi, updateJobApi } from '../../api/job.api';
import { Briefcase, AlertCircle, Sparkles } from 'lucide-react';

const INITIAL_FORM = {
  title: '',
  company: '',
  location: '',
  jobType: 'full-time',
  workMode: 'remote',
  experienceLevel: 'mid',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  salaryPeriod: 'yearly',
  applicationDeadline: '',
  description: '',
  requiredSkills: '',
  responsibilities: '',
  status: 'active',
};

export default function JobFormModal({
  isOpen,
  onClose,
  jobToEdit = null,
  onJobSaved,
}) {
  const toast = useToast();
  const isEditing = Boolean(jobToEdit?._id);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title || '',
        company: jobToEdit.company || '',
        location: jobToEdit.location || '',
        jobType: jobToEdit.jobType || 'full-time',
        workMode: jobToEdit.workMode || 'remote',
        experienceLevel: jobToEdit.experienceLevel || 'mid',
        salaryMin: jobToEdit.salary?.min != null ? String(jobToEdit.salary.min) : '',
        salaryMax: jobToEdit.salary?.max != null ? String(jobToEdit.salary.max) : '',
        salaryCurrency: jobToEdit.salary?.currency || 'USD',
        salaryPeriod: jobToEdit.salary?.period || 'yearly',
        applicationDeadline: jobToEdit.applicationDeadline
          ? new Date(jobToEdit.applicationDeadline).toISOString().split('T')[0]
          : '',
        description: jobToEdit.description || '',
        requiredSkills: Array.isArray(jobToEdit.requiredSkills)
          ? jobToEdit.requiredSkills.join(', ')
          : '',
        responsibilities: Array.isArray(jobToEdit.responsibilities)
          ? jobToEdit.responsibilities.join('\n')
          : '',
        status: jobToEdit.status || 'active',
      });
      setErrors({});
    } else {
      setFormData(INITIAL_FORM);
      setErrors({});
    }
  }, [jobToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required.';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Job title must be at least 3 characters.';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required.';
    } else if (formData.company.trim().length < 2) {
      newErrors.company = 'Company name must be at least 2 characters.';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Job location is required (e.g. Remote, Austin, TX).';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required.';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long.';
    }

    const min = formData.salaryMin ? Number(formData.salaryMin) : null;
    const max = formData.salaryMax ? Number(formData.salaryMax) : null;
    if (min !== null && min < 0) {
      newErrors.salaryMin = 'Minimum salary cannot be negative.';
    }
    if (max !== null && max < 0) {
      newErrors.salaryMax = 'Maximum salary cannot be negative.';
    }
    if (min !== null && max !== null && min > max) {
      newErrors.salaryMax = 'Maximum salary cannot be less than minimum salary.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const skills = formData.requiredSkills
        ? formData.requiredSkills
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

      const responsibilities = formData.responsibilities
        ? formData.responsibilities
            .split('\n')
            .map((r) => r.trim())
            .filter(Boolean)
        : [];

      const payload = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        jobType: formData.jobType,
        workMode: formData.workMode,
        experienceLevel: formData.experienceLevel,
        description: formData.description.trim(),
        requiredSkills: skills,
        responsibilities,
        status: formData.status,
      };

      if (formData.salaryMin || formData.salaryMax) {
        payload.salary = {
          min: formData.salaryMin ? Number(formData.salaryMin) : null,
          max: formData.salaryMax ? Number(formData.salaryMax) : null,
          currency: formData.salaryCurrency || 'USD',
          period: formData.salaryPeriod || 'yearly',
        };
      }

      if (formData.applicationDeadline) {
        payload.applicationDeadline = new Date(formData.applicationDeadline).toISOString();
      } else {
        payload.applicationDeadline = null;
      }

      let savedJob;
      if (isEditing) {
        const res = await updateJobApi(jobToEdit._id, payload);
        savedJob = res.data?.job;
        toast.success(`Job listing "${payload.title}" has been updated.`, 'Job Updated');
      } else {
        const res = await createJobApi(payload);
        savedJob = res.data?.job;
        toast.success(`New job listing "${payload.title}" has been published!`, 'Job Created');
      }

      onClose();
      if (onJobSaved) {
        onJobSaved(savedJob);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save job listing.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Job Listing' : 'Post a New Job Opportunity'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Briefcase className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Publish Job Listing'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Row 1: Title & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Job Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Senior Full Stack Engineer"
            error={errors.title}
            required
          />

          <Input
            label="Company Name"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="e.g. Stripe, Acme Corp"
            error={errors.company}
            required
          />
        </div>

        {/* Row 2: Location, Job Type, Work Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Remote, San Francisco, CA"
            error={errors.location}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Job Type
            </label>
            <select
              name="jobType"
              value={formData.jobType}
              onChange={handleChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Work Mode
            </label>
            <select
              name="workMode"
              value={formData.workMode}
              onChange={handleChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </div>
        </div>

        {/* Row 3: Experience Level, Status, Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Experience Level
            </label>
            <select
              name="experienceLevel"
              value={formData.experienceLevel}
              onChange={handleChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior Level</option>
              <option value="lead">Lead / Principal</option>
              <option value="executive">Executive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Listing Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="active">Active (Open for applications)</option>
              <option value="draft">Draft (Private, not accepting applications)</option>
              {isEditing && <option value="closed">Closed (Applications suspended)</option>}
            </select>
          </div>

          <Input
            label="Application Deadline"
            name="applicationDeadline"
            type="date"
            value={formData.applicationDeadline}
            onChange={handleChange}
            helperText="Optional target closing date"
          />
        </div>

        {/* Row 4: Compensation / Salary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>Compensation Details</span>
            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Min Salary"
              name="salaryMin"
              type="number"
              value={formData.salaryMin}
              onChange={handleChange}
              placeholder="e.g. 120000"
              error={errors.salaryMin}
            />

            <Input
              label="Max Salary"
              name="salaryMax"
              type="number"
              value={formData.salaryMax}
              onChange={handleChange}
              placeholder="e.g. 160000"
              error={errors.salaryMax}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Currency
              </label>
              <select
                name="salaryCurrency"
                value={formData.salaryCurrency}
                onChange={handleChange}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Period
              </label>
              <select
                name="salaryPeriod"
                value={formData.salaryPeriod}
                onChange={handleChange}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="yearly">Per Year</option>
                <option value="monthly">Per Month</option>
                <option value="hourly">Per Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex justify-between">
            <span>
              Job Description <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400">Min 10 characters</span>
          </label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed overview of the role, expectations, and company culture..."
            className={`w-full bg-white text-slate-900 border rounded-lg text-sm px-3.5 py-2.5 transition-all focus:outline-hidden focus:ring-2 ${
              errors.description
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20'
            }`}
          />
          {errors.description && (
            <p className="text-xs font-medium text-rose-600">{errors.description}</p>
          )}
        </div>

        {/* Required Skills & Responsibilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex justify-between">
              <span>Required Skills</span>
              <span className="text-[10px] text-slate-400">Comma separated</span>
            </label>
            <textarea
              name="requiredSkills"
              rows={3}
              value={formData.requiredSkills}
              onChange={handleChange}
              placeholder="React, TypeScript, Node.js, AWS, PostgreSQL"
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex justify-between">
              <span>Key Responsibilities</span>
              <span className="text-[10px] text-slate-400">One per line</span>
            </label>
            <textarea
              name="responsibilities"
              rows={3}
              value={formData.responsibilities}
              onChange={handleChange}
              placeholder="Design and ship full-stack web features&#10;Collaborate with product and design&#10;Participate in code reviews"
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg text-sm px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
