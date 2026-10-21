import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import { useToast } from '../common/Toast';
import {
  updateMyProfileApi,
  uploadResumeApi,
  downloadMyResumeApi,
} from '../../api/user.api';
import {
  User,
  Phone,
  MapPin,
  Sparkles,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  X,
  FileCheck,
} from 'lucide-react';

export default function CandidateProfileSection({ user, onProfileUpdated }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    skills: Array.isArray(user?.skills) ? user.skills : [],
    newSkill: '',
    experienceYears:
      user?.experience && user.experience[0]?.years !== undefined
        ? String(user.experience[0].years)
        : '',
    experienceTitle:
      user?.experience && user.experience[0]?.title
        ? user.experience[0].title
        : '',
    experienceCompany:
      user?.experience && user.experience[0]?.company
        ? user.experience[0].company
        : '',
    experienceDesc:
      user?.experience && user.experience[0]?.description
        ? user.experience[0].description
        : '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        skills: Array.isArray(user.skills) ? user.skills : [],
        experienceYears:
          user.experience && user.experience[0]?.years !== undefined
            ? String(user.experience[0].years)
            : '',
        experienceTitle:
          user.experience && user.experience[0]?.title
            ? user.experience[0].title
            : '',
        experienceCompany:
          user.experience && user.experience[0]?.company
            ? user.experience[0].company
            : '',
        experienceDesc:
          user.experience && user.experience[0]?.description
            ? user.experience[0].description
            : '',
      }));
    }
  }, [user]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = formData.newSkill.trim().toLowerCase();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
        newSkill: '',
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        skills: formData.skills,
      };

      if (formData.experienceTitle.trim() || formData.experienceYears) {
        payload.experience = [
          {
            title: formData.experienceTitle.trim(),
            company: formData.experienceCompany.trim(),
            years: formData.experienceYears ? Number(formData.experienceYears) : undefined,
            description: formData.experienceDesc.trim(),
          },
        ];
      }

      const response = await updateMyProfileApi(payload);
      toast.success('Your candidate profile has been updated.', 'Profile Saved');
      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated(response.data?.user);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.', 'Update Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick validations
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      toast.error('Only PDF and DOCX files are permitted for resumes.', 'Invalid File Type');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume document cannot exceed 5MB.', 'File Too Large');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadResumeApi(file);
      toast.success(
        `Resume "${response.data?.resume?.filename || file.name}" uploaded successfully.`,
        'Resume Saved'
      );
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload resume.', 'Upload Error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadResume = async () => {
    setIsDownloading(true);
    try {
      if (!hasResume) {
        toast.info('No resume document found. Please upload your resume first.', 'No Resume');
        return;
      }
      const blob = await downloadMyResumeApi();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', user?.resume?.filename || 'candidate-resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Failed to download resume.', 'Download Error');
    } finally {
      setIsDownloading(false);
    }
  };

  const hasResume = Boolean(
    user?.resume?.hasResume === true ||
    (user?.resume?.filename && user?.resume?.url)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1 & 2: Candidate Profile Details */}
      <div className="lg:col-span-2">
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Candidate Profile</span>
              </CardTitle>
              <CardDescription>
                Manage your public information, verified contact details, and ATS skills
              </CardDescription>
            </div>

            <Button
              variant={isEditing ? 'subtle' : 'secondary'}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {!isEditing ? (
              /* View Mode */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-medium">Full Name</span>
                    <div className="font-semibold text-slate-900 text-sm">{user?.name}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-medium">Account Email</span>
                    <div className="font-semibold text-slate-900 text-sm">{user?.email}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-medium">Phone Number</span>
                    <div className="font-semibold text-slate-900 text-sm">
                      {user?.phone || <span className="text-slate-400 italic">Not specified</span>}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-medium">Preferred Location</span>
                    <div className="font-semibold text-slate-900 text-sm">
                      {user?.location || <span className="text-slate-400 italic">Remote / Flexible</span>}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Skills & Technologies</span>
                  </div>
                  {user?.skills && user.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.map((skill, i) => (
                        <Badge key={i} variant="blue" size="sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No skills added yet. Add relevant technical skills to boost ATS matching.
                    </p>
                  )}
                </div>

                {/* Experience */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                    <span>Experience History</span>
                  </div>
                  {user?.experience && user.experience.length > 0 ? (
                    <div className="space-y-2">
                      {user.experience.map((exp, idx) => (
                        <div
                          key={exp._id || idx}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{exp.title || 'Software Engineer'}</span>
                            <span className="text-slate-500 font-normal">
                              {exp.years ? `${exp.years} years` : ''}
                            </span>
                          </div>
                          {exp.company && <div className="text-slate-600">{exp.company}</div>}
                          {exp.description && (
                            <p className="text-slate-500 text-[11px] mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No experience history recorded.</p>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Form Mode */
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />

                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    icon={<Phone className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <Input
                  label="Location"
                  placeholder="San Francisco, CA or Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  icon={<MapPin className="w-4 h-4 text-slate-400" />}
                />

                {/* Skills Tag Management */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Skills
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a skill (e.g. React, Node.js, Go)..."
                      value={formData.newSkill}
                      onChange={(e) => setFormData({ ...formData, newSkill: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill(e);
                        }
                      }}
                      className="flex-1 bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddSkill}>
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                      >
                        <span>{skill}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-blue-900"
                          onClick={() => handleRemoveSkill(skill)}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience Fields */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Primary Experience
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Job Title"
                      placeholder="Senior Full Stack Engineer"
                      value={formData.experienceTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceTitle: e.target.value })
                      }
                    />

                    <Input
                      label="Company Name"
                      placeholder="Current or Most Recent Company"
                      value={formData.experienceCompany}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceCompany: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Total Years"
                      type="number"
                      min="0"
                      placeholder="Years (e.g. 4)"
                      value={formData.experienceYears}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceYears: e.target.value })
                      }
                    />

                    <div className="sm:col-span-2">
                      <Input
                        label="Summary Description"
                        placeholder="Brief summary of responsibilities and achievements..."
                        value={formData.experienceDesc}
                        onChange={(e) =>
                          setFormData({ ...formData, experienceDesc: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Column 3: Resume Management */}
      <div>
        <Card variant="default">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Resume Document</span>
            </CardTitle>
            <CardDescription>
              Private PDF or DOCX file stored with authorized access
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4 text-xs">
            {hasResume ? (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[180px]">
                        {user?.resume?.filename || 'Candidate_Resume.pdf'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {user?.resume?.fileSize
                          ? `${(user.resume.fileSize / 1024).toFixed(1)} KB • `
                          : ''}
                        Verified Document
                      </div>
                    </div>
                  </div>

                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleDownloadResume}
                    isLoading={isDownloading}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    View Document
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="font-semibold text-slate-800">No Resume Uploaded</div>
                <p className="text-[11px] text-slate-500">
                  Upload your CV in PDF or DOCX format (max 5MB)
                </p>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />

            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              {hasResume ? 'Replace Resume' : 'Upload Resume'}
            </Button>

            <div className="space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Binary signature inspection enabled</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Strictly private; only verified recruiters can view</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

CandidateProfileSection.propTypes = {
  user: PropTypes.object,
  onProfileUpdated: PropTypes.func,
};
