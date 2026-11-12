import { useEffect, useState } from 'react';
import { meetingApi } from '../../services/meetingApi';

interface Props { meetingId: string; meetingTitle: string; onClose: () => void }

export default function MeetingInvitationPanel({ meetingId, meetingTitle, onClose }: Props) {
  const [invite, setInvite] = useState<{ meetingId: string; joinCode: string; invitationId: string } | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { meetingApi.getMeetingInvitation(meetingId).then(setInvite).catch(() => setNotice('Invitation details could not be loaded.')); }, [meetingId]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const link = invite ? `${window.location.origin}/join/${invite.invitationId}` : '';
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); }
    catch { setNotice('Clipboard access was blocked by the browser. Copy the value manually.'); }
  };
  const share = async () => {
    const text = `${meetingTitle}\nMeeting ID: ${invite?.meetingId}\nJoin code: ${invite?.joinCode}\n${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: meetingTitle, text }); setNotice('Invitation shared.'); return; }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    await copy(text);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-in fade-in" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="share-meeting-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#171824] p-6 text-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2">
      <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-violet-300">Invite participants</p><h2 id="share-meeting-title" className="mt-1 text-xl font-semibold">Share meeting</h2><p className="mt-1 text-sm text-slate-400">{meetingTitle}</p></div><button type="button" onClick={onClose} aria-label="Close share meeting dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white">✕</button></div>
      {invite ? <div className="mt-6 grid gap-3">
        {[['Meeting link', link], ['Meeting ID', invite.meetingId], ['Join code', invite.joinCode]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 bg-[#10111A] p-3"><label className="mb-2 block text-xs text-slate-400">{label}</label><div className="flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-sm">{value}</code><button type="button" onClick={() => void copy(value)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-600">Copy</button></div></div>)}
        <button type="button" onClick={() => void share()} className="mt-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500">Share invitation</button>
        <p className="text-center text-xs text-slate-400">Localhost links only work on this computer.</p>
      </div> : <p role="status" className="mt-6 text-sm text-slate-300">{notice || 'Loading invitation…'}</p>}
      {notice && invite && <p role="status" className="mt-3 text-center text-sm text-emerald-300">{notice}</p>}
    </section>
  </div>;
}
