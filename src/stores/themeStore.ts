import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'intellmeet-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Fallback to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Store persistent choice
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Gracefully handle privacy mode / restricted storage
  }
}

// Apply theme to DOM on script evaluation to prevent FOUC
const initialTheme = getInitialTheme();
applyThemeClass(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,

  toggleTheme: () => {
    set((state) => {
      const newTheme: Theme = state.theme === 'light' ? 'dark' : 'light';
      applyThemeClass(newTheme);
      return { theme: newTheme };
    });
  },

  setTheme: (theme: Theme) => {
    applyThemeClass(theme);
    set({ theme });
  },
}));

