export default function WorkspaceEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-purple-50 to-white dark:from-[#1C1C2E] dark:to-[#0B0B14] rounded-2xl border border-purple-200 dark:border-purple-800/40 shadow-sm">
      {/* SVG illustration */}
      <svg className="w-20 h-20 mb-5" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="url(#ws-grad)" />
        <defs>
          <linearGradient id="ws-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6D28D9" />
            <stop offset="1" stopColor="#5B21B6" />
          </linearGradient>
        </defs>
        <path d="M20 30h24v4H20v-4zm0-10h24v4H20v-4z" fill="white" />
        <circle cx="32" cy="46" r="5" fill="white" />
      </svg>

      <h3 className="text-lg font-bold text-[#0F172A] dark:text-white mb-2">
        Your workspace starts here
      </h3>
      <p className="text-sm text-[#64748B] dark:text-slate-400 mb-6 text-center max-w-xs leading-relaxed">
        Create a workspace to collaborate with your team, schedule meetings, and share transcripts.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6D28D9] transition-colors"
      >
        Create Your First Workspace
      </button>
    </div>
  );
}
