export default function CinematicAuthBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none transition-colors duration-500 bg-[#F5F3FF] dark:bg-[#07090E]"
      aria-hidden="true"
    >
      {/* Subtle Micro-Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.055]"
        style={{
          backgroundImage: `radial-gradient(rgba(109, 40, 217, 0.8) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Primary Floating Orb (Top Left / Center) */}
      <div
        className="absolute -top-24 left-1/4 w-[560px] h-[560px] rounded-full blur-[115px] opacity-45 dark:opacity-25 bg-gradient-to-tr from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] animate-orb-drift-1"
      />

      {/* Secondary Floating Orb (Bottom Right) */}
      <div
        className="absolute -bottom-24 right-1/6 w-[520px] h-[520px] rounded-full blur-[125px] opacity-40 dark:opacity-20 bg-gradient-to-bl from-[#4338CA] via-[#6D28D9] to-[#1E1B4B] animate-orb-drift-2"
      />

      {/* Accent Lavender/Fuchsia Orb (Mid-Screen Left) */}
      <div
        className="absolute top-1/2 -left-20 w-[380px] h-[380px] rounded-full blur-[95px] opacity-30 dark:opacity-15 bg-gradient-to-r from-[#C084FC] to-[#818CF8] animate-orb-drift-3"
      />

      {/* Subtle Ambient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-purple-100/20 dark:to-transparent" />

      {/* Delicate Micro-Particles (Soft Constellation Glows) */}
      <div className="absolute top-[18%] left-[15%] w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-300 opacity-30 animate-particle-pulse" />
      <div
        className="absolute top-[28%] right-[22%] w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-300 opacity-40 animate-particle-pulse"
        style={{ animationDelay: '1.2s' }}
      />
      <div
        className="absolute bottom-[32%] left-[25%] w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 opacity-30 animate-particle-pulse"
        style={{ animationDelay: '2.4s' }}
      />
      <div
        className="absolute bottom-[22%] right-[18%] w-1.5 h-1.5 rounded-full bg-violet-400 dark:bg-violet-300 opacity-40 animate-particle-pulse"
        style={{ animationDelay: '3.1s' }}
      />
    </div>
  );
}

