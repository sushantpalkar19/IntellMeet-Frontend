import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import CinematicAuthBackground from '../components/ui/CinematicAuthBackground';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data);
      navigate(useAuthStore.getState().user?.mustChangePassword ? '/change-password' : '/dashboard');
    } catch {
      // Store manages the error state
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

      <div className="max-w-md w-full space-y-6 z-10 animate-card-entrance">
        {/* Brand Logo & Heading with Staggered Entrance */}
        <div className="text-center animate-stagger-1">
          <BrandLogo size="lg" showSubtitle={false} />
          <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight transition-colors duration-200">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B] dark:text-slate-400 transition-colors duration-200">
            Sign in to continue to your workspace.
          </p>
        </div>

        {/* Authentication Card with Glassmorphic Highlight in Dark Mode */}
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

          {forgotPasswordNotice && (
            <div
              className="mb-6 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-[#1E1B4B] dark:text-purple-200 px-4 py-3 rounded-xl text-xs leading-relaxed flex items-start justify-between transition-all duration-200"
              role="status"
            >
              <span>
                Self-serve password reset is currently unavailable. Please reach out to your workspace administrator for account assistance.
              </span>
              <button
                type="button"
                onClick={() => setForgotPasswordNotice(false)}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 ml-2 font-bold focus:outline-none"
                aria-label="Dismiss notice"
              >
                &times;
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 transition-colors">
                Email address
              </label>
              <input
                {...register('email')}
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
                <p id="email-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 transition-colors">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(true)}
                  className="text-xs font-semibold text-[#6D28D9] dark:text-[#A78BFA] hover:text-[#5B21B6] dark:hover:text-[#C4B5FD] transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`h-11 block w-full px-3.5 py-2 pr-11 bg-white dark:bg-[#131B2E] border ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-[#6D28D9] dark:focus:border-[#8B5CF6] focus:ring-[#6D28D9]/20 dark:focus:ring-[#8B5CF6]/30'
                  } rounded-lg text-sm text-[#0F172A] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all duration-150 font-sans`}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
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
                <p id="password-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#6D28D9] dark:text-[#8B5CF6] focus:ring-[#6D28D9] border-slate-300 dark:border-slate-700 dark:bg-[#131B2E] rounded cursor-pointer accent-[#6D28D9]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-[#64748B] dark:text-slate-400 cursor-pointer select-none transition-colors">
                Remember my session on this device
              </label>
            </div>

            {/* Submit Button with Hover Glow & Pressed State */}
            <div className="pt-1">
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
                    <span>Signing in...</span>
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Create Account Link Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center transition-colors">
            <p className="text-sm text-[#64748B] dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#6D28D9] dark:text-[#A78BFA] hover:text-[#5B21B6] dark:hover:text-[#C4B5FD] transition-colors focus:outline-none focus:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Enterprise Trust Footer */}
        <div className="text-center animate-stagger-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors">
            Protected by enterprise encryption &amp; secure JWT token rotation.
          </p>
        </div>
      </div>
    </div>
  );
}
