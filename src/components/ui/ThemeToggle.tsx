import { useThemeStore } from '../../stores/themeStore';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 ${
        isDark
          ? 'bg-[#131B2E]/90 border-slate-700/80 text-amber-300 hover:bg-[#1E293B] hover:border-slate-600 shadow-md shadow-purple-950/40'
          : 'bg-white/90 border-purple-100/90 text-purple-700 hover:bg-purple-50/80 hover:border-purple-200 shadow-sm'
      } ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon */}
        <svg
          className={`w-4 h-4 transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-amber-300'
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Moon Icon */}
        <svg
          className={`w-4 h-4 transition-all duration-300 transform ${
            !isDark
              ? 'rotate-0 scale-100 opacity-100 text-[#6D28D9]'
              : 'rotate-90 scale-0 opacity-0 absolute'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
    </button>
  );
}

