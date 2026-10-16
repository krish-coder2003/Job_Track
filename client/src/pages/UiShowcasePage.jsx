import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageContainer from '../components/common/PageContainer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingIndicator, { Skeleton } from '../components/common/LoadingIndicator';
import { useToast } from '../components/common/Toast';
import {
  Sparkles,
  Send,
  Mail,
  Lock,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  User,
} from 'lucide-react';

export default function UiShowcasePage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState('md');
  const [btnLoading, setBtnLoading] = useState(false);

  // Form demonstration state
  const [formData, setFormData] = useState({
    candidateName: 'Jane Smith',
    email: 'jane.smith@example.com',
    roleTitle: 'Senior Frontend Developer',
    errorExample: '',
  });

  const handleSimulateLoading = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      toast.success('Action executed successfully!', 'Task Completed');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1">
        <PageContainer
          title="UI Design System & Component Kit"
          subtitle="Enterprise-grade reusable components built with React, Vite, and Tailwind CSS. Designed with clean white backgrounds, high-contrast navy typography, and restrained blue accents."
          badge={<Badge variant="blue" dot>v1.0 Ready</Badge>}
          actions={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => {
                setModalSize('md');
                setModalOpen(true);
              }}
            >
              Preview Modal Dialog
            </Button>
          }
        >
          <div className="space-y-12">
            {/* 1. Buttons Section */}
            <section id="section-buttons" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>1. Buttons & Interaction States</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tailored variants for primary CTAs, secondary actions, outlines, ghosts, and loading spinners.
                </p>
              </div>

              <Card>
                <CardContent className="space-y-6">
                  {/* Variants */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Variants</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary">Primary Button</Button>
                      <Button variant="secondary">Secondary Button</Button>
                      <Button variant="outline">Outline Button</Button>
                      <Button variant="subtle">Subtle Accent</Button>
                      <Button variant="ghost">Ghost Button</Button>
                      <Button variant="danger">Destructive Action</Button>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Sizes</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" size="sm">Small (sm)</Button>
                      <Button variant="primary" size="md">Medium (md)</Button>
                      <Button variant="primary" size="lg">Large (lg)</Button>
                    </div>
                  </div>

                  {/* With Icons and Loading */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      States & Icon Accessories
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="primary"
                        leftIcon={<Send className="w-4 h-4" />}
                        isLoading={btnLoading}
                        onClick={handleSimulateLoading}
                      >
                        {btnLoading ? 'Processing Request...' : 'Trigger Loading State'}
                      </Button>
                      <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4 text-slate-400" />}>
                        Next Pipeline Step
                      </Button>
                      <Button variant="primary" disabled>
                        Disabled Button
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 2. Form Inputs & Error Handling Section */}
            <section id="section-inputs" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>2. Accessible Inputs & Validation States</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consistent input styles, labels, helper texts, and accessible inline error indicators.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard Input States</CardTitle>
                    <CardDescription>Normal, icon-accompanied, and helper text inputs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Candidate Full Name"
                      name="candidateName"
                      required
                      value={formData.candidateName}
                      onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                      placeholder="e.g. Jane Smith"
                      icon={<User className="w-4 h-4" />}
                      helperText="Official legal name for ATS candidate profile."
                    />

                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. jane@company.com"
                      icon={<Mail className="w-4 h-4" />}
                      helperText="Used for interview notifications and verification."
                    />

                    <Input
                      label="Search Query"
                      name="search"
                      placeholder="Search jobs, skills, or candidates..."
                      icon={<Search className="w-4 h-4" />}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Error & Validation States</CardTitle>
                    <CardDescription>Validation feedback and disabled input states.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Password Input"
                      name="password"
                      type="password"
                      placeholder="Minimum 8 characters..."
                      icon={<Lock className="w-4 h-4" />}
                      error="Password is too weak. Must contain at least 8 characters."
                    />

                    <Input
                      label="Disabled Input Example"
                      name="disabledField"
                      disabled
                      value="System Generated Candidate ID #84920"
                      helperText="This field is managed automatically by the backend ATS."
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* 3. Badges & Status Indicators Section */}
            <section id="section-badges" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>3. Badges & Status Indicators</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Refined badge indicators for applicant pipeline stages, roles, and status tags.
                </p>
              </div>

              <Card>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Color Variants</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="blue" dot>Candidate</Badge>
                      <Badge variant="navy" dot>Administrator</Badge>
                      <Badge variant="success" dot>Active / Hired</Badge>
                      <Badge variant="warning" dot>Interview Scheduled</Badge>
                      <Badge variant="danger" dot>Rejected / Disabled</Badge>
                      <Badge variant="gray">Archived</Badge>
                      <Badge variant="outline">Draft Listing</Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Sizes</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="blue" size="sm">Small Tag</Badge>
                      <Badge variant="blue" size="md">Medium Tag</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 4. Cards & Compound Layouts Section */}
            <section id="section-cards" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>4. Cards & Containers</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard, elevated, and subtle card containers with header, content, and footer regions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="default">
                  <CardHeader>
                    <CardTitle>Default Clean Card</CardTitle>
                    <CardDescription>Clean border with subtle 1px slate stroke.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Optimal for standard content sections, job summaries, and application lists.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Badge variant="blue" size="sm">Active</Badge>
                    <Button variant="ghost" size="sm">Details</Button>
                  </CardFooter>
                </Card>

                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Elevated Shadow Card</CardTitle>
                    <CardDescription>Soft shadow elevation for emphasized widgets.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Useful for highlighted metrics, analytics cards, or focused user actions.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Badge variant="success" size="sm" dot>98% Match</Badge>
                    <Button variant="primary" size="sm">Review</Button>
                  </CardFooter>
                </Card>

                <Card variant="subtle">
                  <CardHeader>
                    <CardTitle>Subtle Background Card</CardTitle>
                    <CardDescription>Soft slate fill for secondary info panels.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Great for audit logs, tips, and secondary meta details.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Badge variant="gray" size="sm">Audit Log</Badge>
                    <Button variant="secondary" size="sm">View</Button>
                  </CardFooter>
                </Card>
              </div>
            </section>

            {/* 5. Modals & Dialogs Section */}
            <section id="section-modals" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>5. Modal Dialogs</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accessible dialog overlays with keyboard ESC support, backdrop blur, and custom footers.
                </p>
              </div>

              <Card>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setModalSize('sm');
                      setModalOpen(true);
                    }}
                  >
                    Launch Small Modal (sm)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setModalSize('md');
                      setModalOpen(true);
                    }}
                  >
                    Launch Medium Modal (md)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setModalSize('lg');
                      setModalOpen(true);
                    }}
                  >
                    Launch Large Modal (lg)
                  </Button>
                </CardContent>
              </Card>
            </section>

            {/* 6. Toast Notifications Section */}
            <section id="section-toasts" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>6. Toast Notifications</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Global non-blocking notifications with automatic dismissal and distinct severity levels.
                </p>
              </div>

              <Card>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    className="border-emerald-200 hover:bg-emerald-50 text-emerald-800"
                    leftIcon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                    onClick={() => toast.success('Candidate application has been submitted successfully!', 'Application Received')}
                  >
                    Success Toast
                  </Button>
                  <Button
                    variant="secondary"
                    className="border-rose-200 hover:bg-rose-50 text-rose-800"
                    leftIcon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
                    onClick={() => toast.error('Failed to update candidate record. Please try again.', 'Update Error')}
                  >
                    Error Toast
                  </Button>
                  <Button
                    variant="secondary"
                    className="border-amber-200 hover:bg-amber-50 text-amber-800"
                    leftIcon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                    onClick={() => toast.warning('Your recruiter session will expire in 10 minutes.', 'Session Warning')}
                  >
                    Warning Toast
                  </Button>
                  <Button
                    variant="secondary"
                    className="border-blue-200 hover:bg-blue-50 text-blue-800"
                    leftIcon={<Info className="w-4 h-4 text-blue-600" />}
                    onClick={() => toast.info('New candidates matched your search criteria.', 'Pipeline Update')}
                  >
                    Info Toast
                  </Button>
                </CardContent>
              </Card>
            </section>

            {/* 7. Loading Indicators & Skeletons Section */}
            <section id="section-loading" className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>7. Loading Indicators & Skeletons</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Smooth CSS and SVG loaders along with pulse skeletons for content placeholders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Spinners & Loaders</CardTitle>
                    <CardDescription>Configurable size and color variations.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center space-x-8">
                    <LoadingIndicator size="sm" />
                    <LoadingIndicator size="md" text="Loading jobs..." />
                    <LoadingIndicator size="lg" variant="navy" />
                    <LoadingIndicator size="xl" variant="primary" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pulse Skeleton Placeholders</CardTitle>
                    <CardDescription>Skeleton blocks simulating loading content.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </PageContainer>
      </main>

      {/* Interactive Modal Instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size={modalSize}
        title="Candidate Interview Scheduling"
        description="Select date, time, and interview panel members for this candidate."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setModalOpen(false);
                toast.success('Interview scheduled and invitation emails dispatched!', 'Scheduled');
              }}
            >
              Confirm Interview
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Candidate Name"
            name="candModal"
            value="Jane Smith (Senior Frontend Engineer)"
            disabled
          />
          <Input
            label="Interview Title"
            name="interviewTitle"
            defaultValue="Technical Round 1: React & Architecture"
          />
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start space-x-3 text-xs text-blue-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Candidates will receive an automated calendar invitation with Google Meet link.
            </p>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
