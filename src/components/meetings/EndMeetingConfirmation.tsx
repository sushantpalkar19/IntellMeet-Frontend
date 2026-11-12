interface EndMeetingConfirmationProps {
  meetingTitle: string;
  isOpen: boolean;
  isEnding: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function EndMeetingConfirmation({ meetingTitle, isOpen, isEnding, error, onCancel, onConfirm }: EndMeetingConfirmationProps) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="end-meeting-title">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171824] p-6 text-white shadow-2xl">
      <h2 id="end-meeting-title" className="text-lg font-semibold">End meeting for everyone?</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">This will end <strong>{meetingTitle}</strong> and disconnect all participants. They will need to rejoin a new meeting to continue.</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" disabled={isEnding} onClick={onCancel} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={isEnding} onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{isEnding ? 'Ending…' : 'End meeting'}</button>
      </div>
    </div>
  </div>;
}
