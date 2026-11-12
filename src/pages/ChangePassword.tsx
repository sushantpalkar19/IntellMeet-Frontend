import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/authApi';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';

export default function ChangePassword() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const connectSocket = useSocketStore((state) => state.connect);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/v1/auth/change-password', { currentPassword, newPassword });
      if (user) updateUser({ ...user, mustChangePassword: false });
      connectSocket();
      navigate('/dashboard');
    } catch (cause) {
      const response = cause as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen flex items-center justify-center bg-[#F5F3FF] dark:bg-[#0B0B14] p-4">
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white dark:bg-[#151522] p-6 shadow">
      <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">Change your temporary password</h1>
      <label className="block text-sm">Current temporary password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-[#0B0B14]" /></label>
      <label className="block text-sm">New password<input required minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Use 8+ characters with uppercase, lowercase, and a number." type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-[#0B0B14]" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-[#6D28D9] p-2 font-semibold text-white disabled:opacity-50">{loading ? 'Saving…' : 'Change password'}</button>
    </form>
  </main>;
}
