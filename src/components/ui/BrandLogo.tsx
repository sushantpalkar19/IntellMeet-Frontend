interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function BrandLogo({ size = 'md', showSubtitle = false }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center space-x-2.5">
        {/* Brand Mark: Purple Gradient Squircle with stylized Intelligent Nodes */}
        <div
          className={`${iconSize} rounded-xl bg-gradient-to-tr from-[#1E1B4B] via-[#6D28D9] to-[#8B5CF6] dark:from-[#2E1065] dark:via-[#6D28D9] dark:to-[#A855F7] flex items-center justify-center shadow-md shadow-purple-900/25 dark:shadow-purple-500/20 border border-white/20 dark:border-purple-400/20 transition-all duration-300`}
        >
          <svg
            className="w-3/5 h-3/5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            {/* Conference / Video node icon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="flex items-baseline">
          <span className={`${textSize} font-extrabold tracking-tight text-[#1E1B4B] dark:text-white transition-colors duration-200`}>
            Intell
          </span>
          <span className={`${textSize} font-extrabold tracking-tight text-[#6D28D9] dark:text-[#A78BFA] transition-colors duration-200`}>
            Meet
          </span>
        </div>
      </div>

      {showSubtitle && (
        <span className="mt-1 text-xs font-medium text-[#64748B] dark:text-slate-400 tracking-wide transition-colors duration-200">
          Enterprise AI Collaboration Platform
        </span>
      )}
    </div>
  );
}
