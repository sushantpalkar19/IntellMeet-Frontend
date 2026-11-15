import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { meetingApi } from '../services/meetingApi';

export default function JoinInvitation() {
  const { invitationId = '' } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    meetingApi
      .joinByCode(invitationId)
      .then((result) => {
        if (isMounted) {
          navigate(`/meeting/${result.meetingId}`, { replace: true });
        }
      })
      .catch((cause: unknown) => {
        if (!isMounted) return;
        const response = cause as { response?: { data?: { message?: string } } };
        setErrorMessage(
          response.response?.data?.message || 'This invitation is invalid, expired, or unavailable. Please sign in to join.'
        );
        setStatus('error');
      });
    return () => {
      isMounted = false;
    };
  }, [invitationId, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F3FF] dark:bg-[#0B0B14] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-[#171525] p-8 text-center shadow-2xl transition-all">
        {/* Brand */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-lg shadow-md shadow-purple-900/30">
              IM
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Intell<span className="text-violet-600 dark:text-violet-400">Meet</span>
            </span>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="space-y-4 py-4">
            <div className="mx-auto h-12 w-12 rounded-full border-3 border-violet-600 border-t-transparent animate-spin" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Connecting to Meeting…
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validating your invitation credentials and preparing the video room.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Unable to Join Meeting
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {errorMessage}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                to="/login"
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-900/20 transition-all text-center"
              >
                Sign In to IntellMeet
              </Link>
              <Link
                to="/"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
