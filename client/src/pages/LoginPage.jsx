import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/common/Card';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
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
      const response = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const user = response?.data?.user;
      toast.success(
        `Welcome back, ${user?.name || 'User'}!`,
        'Signed In Successfully'
      );

      // Navigate back to origin or to dashboard
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin, { replace: true });
    } catch (err) {
      const message = err.message || 'Invalid email or password. Please try again.';
      setApiError(message);
      toast.error(message, 'Authentication Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-md w-full">
          <Card variant="elevated" className="border-slate-200">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to JobTrack
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Access your candidate pipeline or recruiter portal
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
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                  error={formErrors.email}
                  required
                  autoComplete="email"
                  autoFocus
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
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
                    error={formErrors.password}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    rightIcon={!isSubmitting && <ArrowRight className="w-4 h-4" />}
                    className="w-full justify-center"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="pt-2 pb-6 justify-center border-t border-slate-100 flex-col space-y-3">
              <p className="text-xs text-slate-600 text-center">
                Don&apos;t have an account yet?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                >
                  Create an account
                </Link>
              </p>
              <div className="text-center">
                <span className="inline-flex items-center text-[11px] text-slate-500">
                  Protected with secure HTTP-only cookie authentication
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
