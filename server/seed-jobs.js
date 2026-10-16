import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from './src/config/db.js';
import User from './src/models/user.model.js';
import Job, { JOB_STATUS, JOB_TYPES, WORK_MODES, EXPERIENCE_LEVELS } from './src/models/job.model.js';

async function seedJobs() {
  console.log('Seeding initial verified jobs for JobTrack...');
  await connectDB();

  try {
    // Find or create default demo recruiter
    let recruiter = await User.findOne({ email: 'recruiter@jobtrack.com' });
    if (!recruiter) {
      recruiter = await User.create({
        name: 'Sarah Jenkins',
        email: 'recruiter@jobtrack.com',
        password: 'Password123!',
        role: 'recruiter',
        status: 'active',
        location: 'San Francisco, CA',
        phone: '+1 (555) 234-5678',
      });
      console.log('Created demo recruiter:', recruiter.email);
    }

    // Clean up existing seeded sample jobs
    await Job.deleteMany({ company: { $in: ['Stripe', 'Vercel', 'Linear', 'Figma', 'Datadog', 'Modern Tech Labs', 'Stealth Startup'] } });

    const sampleJobs = [
      {
        title: 'Senior Staff Full-Stack Engineer',
        company: 'Stripe',
        description: `Stripe is looking for a Senior Staff Full-Stack Engineer to lead the technical evolution of our merchant dashboards and developer surfaces. In this role, you will architect resilient distributed systems, build beautiful micro-frontends with React and TypeScript, and optimize latency across global payment pathways.\n\nYou will work closely with product managers, security engineers, and external partners to deliver seamless payment experiences used by millions of businesses worldwide.`,
        responsibilities: [
          'Design, build, and maintain high-volume developer APIs and interactive web dashboards',
          'Drive architectural decisions for React, Node.js, and TypeScript frontend ecosystems',
          'Collaborate across cross-functional engineering teams to elevate code quality and reliability',
          'Mentor junior and mid-level engineers and conduct comprehensive technical reviews',
        ],
        requiredSkills: ['react', 'typescript', 'node.js', 'postgresql', 'distributed systems'],
        location: 'San Francisco, CA (Remote)',
        jobType: JOB_TYPES.FULL_TIME,
        workMode: WORK_MODES.REMOTE,
        experienceLevel: EXPERIENCE_LEVELS.SENIOR,
        salary: {
          min: 160000,
          max: 210000,
          currency: 'USD',
          period: 'yearly',
        },
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Lead Frontend Architect',
        company: 'Vercel',
        description: `Join Vercel to shape the future of modern frontend web development. As a Lead Frontend Architect, you will establish core UI design patterns, optimize compile times, and design next-generation developer tooling for React and Next.js applications worldwide.`,
        responsibilities: [
          'Lead frontend system architecture for cloud console and deployment monitoring pipelines',
          'Partner with open-source maintainers to test bleeding-edge React features',
          'Establish accessibility (a11y), performance, and styling standards using Tailwind CSS',
        ],
        requiredSkills: ['next.js', 'react', 'tailwind css', 'web vitals', 'typescript'],
        location: 'New York, NY (Hybrid)',
        jobType: JOB_TYPES.FULL_TIME,
        workMode: WORK_MODES.HYBRID,
        experienceLevel: EXPERIENCE_LEVELS.LEAD,
        salary: {
          min: 180000,
          max: 240000,
          currency: 'USD',
          period: 'yearly',
        },
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Cloud DevOps & Platform Engineer',
        company: 'Linear',
        description: `Linear creates purpose-built software for modern product development. We are looking for an experienced Cloud DevOps Engineer to scale our multi-region Kubernetes clusters, build automated CI/CD pipelines, and guarantee zero-downtime deployments.`,
        responsibilities: [
          'Manage cloud infrastructure using Terraform and AWS cloud native tools',
          'Optimize Docker build pipelines and automated GitHub Actions workflows',
          'Implement telemetry, distributed tracing, and Prometheus alerting',
        ],
        requiredSkills: ['kubernetes', 'aws', 'docker', 'terraform', 'ci/cd'],
        location: 'Remote',
        jobType: JOB_TYPES.FULL_TIME,
        workMode: WORK_MODES.REMOTE,
        experienceLevel: EXPERIENCE_LEVELS.MID,
        salary: {
          min: 130000,
          max: 160000,
          currency: 'USD',
          period: 'yearly',
        },
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Product UI/UX Engineer',
        company: 'Figma',
        description: `Help us build the collaborative canvas of the web. As a Product UI/UX Engineer at Figma, you will blend high-performance WebGL rendering with fluid user interaction design.`,
        responsibilities: [
          'Develop interactive canvas components and real-time multiplayer editing capabilities',
          'Implement micro-animations and responsive design tokens',
          'Collaborate with design teams to bring design system specifications to life',
        ],
        requiredSkills: ['react', 'webgl', 'canvas', 'design systems', 'typescript'],
        location: 'San Francisco, CA',
        jobType: JOB_TYPES.FULL_TIME,
        workMode: WORK_MODES.ON_SITE,
        experienceLevel: EXPERIENCE_LEVELS.SENIOR,
        salary: {
          min: 150000,
          max: 195000,
          currency: 'USD',
          period: 'yearly',
        },
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Backend Systems Engineer (Distributed Streaming)',
        company: 'Datadog',
        description: `Datadog processes trillions of events per day. We are seeking a contract Backend Systems Engineer to improve our telemetry streaming pipelines and optimize message queues.`,
        responsibilities: [
          'Scale distributed Kafka event pipelines handling high-throughput telemetry',
          'Write high-performance Go and Node.js microservices',
          'Benchmark query performance across distributed data stores',
        ],
        requiredSkills: ['go', 'kafka', 'distributed systems', 'redis', 'node.js'],
        location: 'Boston, MA (Remote)',
        jobType: JOB_TYPES.CONTRACT,
        workMode: WORK_MODES.REMOTE,
        experienceLevel: EXPERIENCE_LEVELS.SENIOR,
        salary: {
          min: 90,
          max: 120,
          currency: 'USD',
          period: 'hourly',
        },
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Junior Software Engineer (Web & APIs)',
        company: 'Modern Tech Labs',
        description: `Start your software engineering journey with Modern Tech Labs! We are looking for an enthusiastic junior engineer to help us build web tools, integrate third-party REST APIs, and write automated tests. Salary will be determined based on candidate background.`,
        responsibilities: [
          'Develop reusable UI components in React and Vanilla CSS',
          'Write unit and integration tests using Jest and Supertest',
          'Fix bug tickets and participate in sprint planning sessions',
        ],
        requiredSkills: ['javascript', 'react', 'html5', 'css', 'git'],
        location: 'Austin, TX (Hybrid)',
        jobType: JOB_TYPES.FULL_TIME,
        workMode: WORK_MODES.HYBRID,
        experienceLevel: EXPERIENCE_LEVELS.ENTRY,
        salary: null, // Intentionally null to test conditional salary rendering!
        status: JOB_STATUS.ACTIVE,
        isApproved: true,
        recruiter: recruiter._id,
      },
      {
        title: 'Confidential Stealth Founder Role',
        company: 'Stealth Startup',
        description: `Unapproved draft role - must not appear in public job listings.`,
        location: 'Secret',
        jobType: JOB_TYPES.CONTRACT,
        workMode: WORK_MODES.REMOTE,
        experienceLevel: EXPERIENCE_LEVELS.EXECUTIVE,
        status: JOB_STATUS.DRAFT,
        isApproved: false, // Intentionally draft/unapproved to test security isolation!
        recruiter: recruiter._id,
      },
    ];

    const created = await Job.insertMany(sampleJobs);
    console.log(`Successfully seeded ${created.length} jobs into MongoDB.`);
  } finally {
    await disconnectDB();
  }
}

seedJobs().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
