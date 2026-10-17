/**
 * Format salary range into a human-readable string
 * Returns null if no salary information exists
 *
 * @param {Object|null} salary - { min, max, currency, period }
 * @returns {string|null}
 */
export const formatSalary = (salary) => {
  if (!salary) return null;

  const { min, max, currency = 'USD', period = 'yearly' } = salary;

  if (min == null && max == null) return null;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  });

  const periodMap = {
    yearly: '/ yr',
    monthly: '/ mo',
    hourly: '/ hr',
    weekly: '/ wk',
  };

  const periodSuffix = periodMap[period] || `/${period}`;

  if (min != null && max != null) {
    if (min === max) {
      return `${formatter.format(min)} ${periodSuffix}`;
    }
    return `${formatter.format(min)} - ${formatter.format(max)} ${periodSuffix}`;
  }

  if (min != null) {
    return `From ${formatter.format(min)} ${periodSuffix}`;
  }

  if (max != null) {
    return `Up to ${formatter.format(max)} ${periodSuffix}`;
  }

  return null;
};

/**
 * Format job type into capitalized display string
 */
export const formatJobType = (jobType) => {
  if (!jobType) return '';
  const map = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
    temporary: 'Temporary',
  };
  return map[jobType] || jobType;
};

/**
 * Format work mode into capitalized display string
 */
export const formatWorkMode = (workMode) => {
  if (!workMode) return '';
  const map = {
    remote: 'Remote',
    'on-site': 'On-site',
    hybrid: 'Hybrid',
  };
  return map[workMode] || workMode;
};

/**
 * Format experience level into capitalized display string
 */
export const formatExperienceLevel = (level) => {
  if (!level) return '';
  const map = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead / Principal',
    executive: 'Executive',
  };
  return map[level] || level;
};

/**
 * Format relative or calendar date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) return 'Just now';
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format application lifecycle status with label, badge color variant, and description
 */
export const formatApplicationStatus = (status) => {
  if (!status) return { label: 'Pending', variant: 'warning', description: 'Pending recruiter review' };
  const map = {
    pending: {
      label: 'Submitted',
      variant: 'warning',
      description: 'Your application has been received and is waiting for recruiter review.',
    },
    reviewing: {
      label: 'In Review',
      variant: 'blue',
      description: 'The recruiter is actively evaluating your qualifications and resume snapshot.',
    },
    shortlisted: {
      label: 'Shortlisted',
      variant: 'navy',
      description: 'Congratulations! Your profile has been shortlisted for this role.',
    },
    interviewing: {
      label: 'Interviewing',
      variant: 'warning',
      description: 'You are currently in the interview round with the hiring team.',
    },
    accepted: {
      label: 'Accepted',
      variant: 'success',
      description: 'Offer extended or candidate accepted for this position.',
    },
    rejected: {
      label: 'Not Selected',
      variant: 'danger',
      description: 'The recruiter has decided not to move forward with your application.',
    },
    withdrawn: {
      label: 'Withdrawn',
      variant: 'gray',
      description: 'You have withdrawn your application for this position.',
    },
    cancelled: {
      label: 'Withdrawn',
      variant: 'gray',
      description: 'You have withdrawn your application for this position.',
    },
  };
  return map[status.toLowerCase()] || { label: status, variant: 'gray', description: '' };
};

