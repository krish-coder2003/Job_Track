import { Kanban, FileText, CheckCircle, BarChart3, ShieldCheck, Zap } from 'lucide-react';

const features = [
  {
    icon: Kanban,
    title: 'Visual ATS Pipeline',
    description:
      'Manage candidates across customizable hiring stages: Applied, Screening, Interview, Offered, and Hired with drag-and-drop ease.',
  },
  {
    icon: FileText,
    title: 'Rich Job Postings',
    description:
      'Create and publish structured job listings with salary brackets, requirements, tags, and department categorization.',
  },
  {
    icon: CheckCircle,
    title: 'Candidate Tracking',
    description:
      'Centralize resumes, candidate interview notes, rating scorecards, and email threads in one clean dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Recruiting Metrics',
    description:
      'Track time-to-hire, applicant conversion rates, and sourcing channels with real-time analytics and visualizations.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description:
      'Secure access control tailored for Recruiters, Hiring Managers, Interviewers, and Job Seekers.',
  },
  {
    icon: Zap,
    title: 'High-Performance API',
    description:
      'Built on Express & MongoDB with indexed schemas, lightweight payloads, and seamless Axios integration.',
  },
];

export default function FeatureCards() {
  return (
    <section id="features" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Platform Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Designed for Both Candidates & Recruiters
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            JobTrack bridges the gap between searching for opportunities and orchestrating
            collaborative hiring pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

