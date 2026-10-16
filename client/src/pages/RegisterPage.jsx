import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/common/Card';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  Building2,
  Phone,
  MapPin,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate', // Only 'candidate' or 'recruiter' permitted
    phone: '',
    location: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (selectedRole) => {
    // Defense-in-depth: strictly allow only candidate or recruiter
    if (selectedRole === 'candidate' || selectedRole === 'recruiter') {
      setFormData((prev) => ({ ...prev, role: selectedRole }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (formData.role !== 'candidate' && formData.role !== 'recruiter') {
      errors.role = 'Please select a valid role (Candidate or Recruiter).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError('');

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        location: formData.location.trim() || undefined,
      });

      toast.success(
        `Your ${formData.role} account has been created.`,
        'Welcome to JobTrack!'
      );

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err.message || 'Registration failed. Please check your inputs and try again.';
      setApiError(message);
      toast.error(message, 'Registration Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="max-w-xl w-full">
          <Card variant="elevated" className="border-slate-200">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-xs">
                <Briefcase className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                Create your JobTrack Account
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Join our platform to apply for jobs or hire elite talent
              </CardDescription>
            </CardHeader>

            <CardContent>
              {apiError && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-sm text-red-700 animate-in fade-in"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1 font-medium">{apiError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Role Selection: Candidate or Recruiter Only */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    I am joining as a <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Candidate Card */}
                    <button
                      type="button"
                      onClick={() => handleRoleChange('candidate')}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
                        formData.role === 'candidate'
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          formData.role === 'candidate'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center">
                          <span>Job Seeker</span>
                          {formData.role === 'candidate' && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          Search openings, track applications & manage offers
                        </p>
                      </div>
                    </button>

                    {/* Recruiter Card */}
                    <button
                      type="button"
                      onClick={() => handleRoleChange('recruiter')}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
                        formData.role === 'recruiter'
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          formData.role === 'recruiter'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center">
                          <span>Recruiter</span>
                          {formData.role === 'recruiter' && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          Post job openings & manage applicant pipelines
                        </p>
                      </div>
                    </button>
                  </div>
                  {formErrors.role && (
                    <p className="mt-1.5 text-xs text-red-600">{formErrors.role}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Morgan"
                    leftIcon={<User className="w-4 h-4 text-slate-400" />}
                    error={formErrors.name}
                    required
                    autoComplete="name"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="alex@example.com"
                    leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                    error={formErrors.email}
                    required
                    autoComplete="email"
                  />
                </div>

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  helperText="Must be at least 8 characters long."
                  error={formErrors.password}
                  required
                  autoComplete="new-password"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                  />

                  <Input
                    label="Location (Optional)"
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. San Francisco, CA"
                    leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    rightIcon={!isSubmitting && <ArrowRight className="w-4 h-4" />}
                    className="w-full justify-center"
                  >
                    {isSubmitting
                      ? 'Creating Account...'
                      : `Register as ${formData.role === 'candidate' ? 'Candidate' : 'Recruiter'}`}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="pt-2 pb-6 justify-center border-t border-slate-100 flex-col space-y-2">
              <p className="text-xs text-slate-600 text-center">
                Already registered?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                >
                  Sign in here
                </Link>
              </p>
              <p className="text-[11px] text-slate-500 text-center">
                Administrator accounts are reserved and cannot be created via public registration.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
