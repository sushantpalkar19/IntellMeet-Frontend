import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import BrandLogo from '../ui/BrandLogo';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationsMenu from './NotificationsMenu';

interface DashboardNavbarProps {
  activeTab?: 'dashboard' | 'workspaces' | 'calendar' | 'analytics';
  onNewMeetingClick?: () => void;
}

export default function DashboardNavbar({
  activeTab = 'dashboard',
  onNewMeetingClick,
}: DashboardNavbarProps) {
  const { user, logout } = useAuthStore();
  const { isConnected, isConnecting } = useSocketStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getConnectionStatusColor = () => {
    if (isConnecting) return 'bg-amber-500';
    if (isConnected) return 'bg-emerald-500';
    return 'bg-red-500';
  };

  const getConnectionStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <nav className="sticky top-0 z-30 bg-white/95 dark:bg-[#151522]/95 backdrop-blur-md border-b border-purple-100/80 dark:border-purple-900/30 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Brand & Primary Links */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center focus:outline-none">
              <BrandLogo size="sm" showSubtitle={false} />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1.5">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950/70 dark:text-[#C4B5FD] font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                Dashboard
              </Link>

              <Link
                to="/workspaces"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'workspaces'
                    ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950/70 dark:text-[#C4B5FD] font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                Workspaces
              </Link>

              <Link to="/calendar" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950/70 dark:text-[#C4B5FD] font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'}`}>Calendar</Link>
              <Link to="/analytics" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950/70 dark:text-[#C4B5FD] font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'}`}>Analytics</Link>

              {onNewMeetingClick && (
                <button
                  type="button"
                  onClick={onNewMeetingClick}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] hover:bg-purple-50/60 dark:hover:bg-purple-950/40 transition-colors flex items-center space-x-1"
                >
                  <span>Meetings</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-[#C4B5FD] rounded font-semibold">
                    Workspace
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle & User Menu */}
          <div className="hidden md:flex items-center space-x-3.5">
            <NotificationsMenu />
            {/* Connection Status Indicator */}
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              title={`WebSocket: ${getConnectionStatusText()}`}
            >
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} ${isConnecting ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                {getConnectionStatusText()}
              </span>
            </div>

            <ThemeToggle />

            {/* User Profile Pill / Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-purple-50/70 dark:hover:bg-[#1C1C2E] border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 transition-all focus:outline-none"
                aria-expanded={userDropdownOpen}
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userInitials}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-tight truncate max-w-[140px]">
                    {user?.email}
                  </p>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    userDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#151522] border border-purple-100 dark:border-purple-900/40 shadow-xl shadow-purple-950/10 py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Signed in as</p>
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/workspaces"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      >
                        <svg className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Manage Workspaces
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700/80 hover:border-red-200 dark:hover:border-red-900/50 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu & Theme Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 focus:outline-none"
              aria-label="Open mobile navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100 dark:border-purple-900/30 px-4 pt-3 pb-4 space-y-2 bg-white dark:bg-[#151522]">
          <div className="flex items-center space-x-3 p-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs">
              {userInitials}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'dashboard'
                ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950 dark:text-[#C4B5FD] font-semibold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/workspaces"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'workspaces'
                ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950 dark:text-[#C4B5FD] font-semibold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            Workspaces
          </Link>

          <Link to="/calendar" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'calendar' ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950 dark:text-[#C4B5FD] font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'}`}>Calendar</Link>
          <Link to="/analytics" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'analytics' ? 'bg-purple-100 text-[#6D28D9] dark:bg-purple-950 dark:text-[#C4B5FD] font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'}`}>Analytics</Link>

          {onNewMeetingClick && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNewMeetingClick();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between"
            >
              <span>Meetings</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-[#C4B5FD] rounded">
                Workspace
              </span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="mb-2 flex justify-end"><NotificationsMenu /></div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

