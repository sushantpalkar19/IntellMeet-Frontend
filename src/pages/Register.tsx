import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import CinematicAuthBackground from '../components/ui/CinematicAuthBackground';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const passwordRegistration = registerField('password');

  // Dynamic password criteria validation checks
  const criteria = {
    length: passwordValue.length >= 8,
    upper: /[A-Z]/.test(passwordValue),
    lower: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    try {
      // Backend expects firstName, lastName, email, password
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      navigate('/dashboard');
    } catch {
      // Error managed by the store
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Cinematic Animated Background with Orbs & Micro-Particles */}
      <CinematicAuthBackground />

      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-20">
        <ThemeToggle />
      </div>

      <div className="max-w-lg w-full space-y-6 z-10 animate-card-entrance">
        {/* Brand Logo & Heading with Staggered Entrance */}
        <div className="text-center animate-stagger-1">
          <BrandLogo size="lg" showSubtitle={false} />
          <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight transition-colors duration-200">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B] dark:text-slate-400 transition-colors duration-200">
            Start collaborating with real-time enterprise workspaces.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white/95 dark:bg-[#0F172A]/90 dark:backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-950/5 dark:shadow-2xl dark:shadow-black/60 border border-purple-100/80 dark:border-purple-900/40 dark:border-t-purple-500/30 p-8 sm:p-10 transition-all duration-300 animate-stagger-2">
          {error && (
            <div
              className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-start space-x-2.5 transition-all duration-200"
              role="alert"
            >
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium text-sm leading-snug">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* First & Last Name Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                  First name
                </label>
                <input
                  {...registerField('firstName')}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Sarah"
                  className={`h-11 block w-full px-3.5 py-2 bg-white dark:bg-[#131B2E] border ${
                    errors.firstName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                  } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150`}
                  aria-invalid={errors.firstName ? 'true' : 'false'}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                  Last name
                </label>
                <input
                  {...registerField('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Connor"
                  className={`h-11 block w-full px-3.5 py-2 bg-white dark:bg-[#131B2E] border ${
                    errors.lastName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                  } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150`}
                  aria-invalid={errors.lastName ? 'true' : 'false'}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                Work email address
              </label>
              <input
                {...registerField('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className={`h-11 block w-full px-3.5 py-2 bg-white dark:bg-[#131B2E] border ${
                  errors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                    : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150`}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                Password
              </label>
              <div className="relative">
                <input
                  {...passwordRegistration}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create secure password"
                  onChange={(e) => {
                    passwordRegistration.onChange(e);
                    setPasswordValue(e.target.value);
                  }}
                  className={`h-11 block w-full px-3.5 py-2 pr-11 bg-white dark:bg-[#131B2E] border ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                  } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150 font-sans`}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : 'password-requirements'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.password.message}
                </p>
              )}

              {/* Password Requirement Checklist */}
              <div id="password-requirements" className="mt-2.5 p-2.5 bg-slate-50 dark:bg-[#131B2E]/70 border border-slate-100 dark:border-slate-800 rounded-lg transition-colors">
                <p className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password Strength Requirements
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-[#64748B] dark:text-slate-400">
                  <span className={`flex items-center space-x-1.5 ${criteria.length ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}>
                    <svg className={`w-3.5 h-3.5 ${criteria.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>8+ characters</span>
                  </span>
                  <span className={`flex items-center space-x-1.5 ${criteria.upper ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}>
                    <svg className={`w-3.5 h-3.5 ${criteria.upper ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>1 uppercase letter</span>
                  </span>
                  <span className={`flex items-center space-x-1.5 ${criteria.lower ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}>
                    <svg className={`w-3.5 h-3.5 ${criteria.lower ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>1 lowercase letter</span>
                  </span>
                  <span className={`flex items-center space-x-1.5 ${criteria.number ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}>
                    <svg className={`w-3.5 h-3.5 ${criteria.number ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>1 number</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                Confirm password
              </label>
              <div className="relative">
                <input
                  {...registerField('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={`h-11 block w-full px-3.5 py-2 pr-11 bg-white dark:bg-[#131B2E] border ${
                    errors.confirmPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                  } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150 font-sans`}
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                >
                  {showConfirmPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Full-Width Purple Create Account Button with Hover Glow & Pressed State */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#6D28D9] hover:bg-[#5B21B6] active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6D28D9] dark:focus:ring-offset-[#0F172A] shadow-md shadow-purple-900/20 hover:shadow-purple-700/35 dark:shadow-purple-950/50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating account...</span>
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>

          {/* Sign In Link Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center transition-colors">
            <p className="text-sm text-[#64748B] dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#6D28D9] dark:text-[#A78BFA] hover:text-[#5B21B6] dark:hover:text-[#C4B5FD] transition-colors focus:outline-none focus:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Terms / Enterprise Trust Footer */}
        <div className="text-center animate-stagger-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors">
            By creating an account, you agree to IntellMeet&apos;s workspace collaboration policies.
          </p>
        </div>
      </div>
    </div>
  );
}
