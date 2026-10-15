import { Kanban, FileText, CheckCircle, BarChart3, ShieldCheck, Zap } from 'lucide-react';

const features = [
  {
    icon: Kanban,
    iconColor: 'text-indigo-400',
    title: 'Visual ATS Pipeline',
    description:
      'Manage candidates across customizable hiring stages: Applied, Screening, Interview, Offered, and Hired with drag-and-drop ease.',
  },
  {
    icon: FileText,
    iconColor: 'text-emerald-400',
    title: 'Rich Job Postings',
    description:
      'Create and publish structured job listings with salary brackets, requirements, tags, and department categorization.',
  },
  {
    icon: CheckCircle,
    iconColor: 'text-sky-400',
    title: 'Candidate Tracking',
    description:
      'Centralize resumes, candidate interview notes, rating scorecards, and email threads in one clean dashboard.',
  },
  {
    icon: BarChart3,
    iconColor: 'text-violet-400',
    title: 'Recruiting Metrics',
    description:
      'Track time-to-hire, applicant conversion rates, and sourcing channels with real-time analytics and visualizations.',
  },
  {
    icon: ShieldCheck,
    iconColor: 'text-amber-400',
    title: 'Role-Based Access',
    description:
      'Secure access control tailored for Recruiters, Hiring Managers, Interviewers, and Job Seekers.',
  },
  {
    icon: Zap,
    iconColor: 'text-pink-400',
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
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Designed for Both Candidates & Recruiters
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
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
                className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
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
