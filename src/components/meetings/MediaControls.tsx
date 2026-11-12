interface MediaControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
  isHost: boolean;
  onEndMeeting: () => void;
  screenSharing: boolean;
  onToggleScreenShare: () => void;
  disabled?: boolean;
  recordingStatus?: string | null;
  recordingBusy?: boolean;
  onStartRecording?: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onStopRecording?: () => void;
}

export default function MediaControls({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
  isHost,
  onEndMeeting,
  screenSharing,
  onToggleScreenShare,
  disabled = false,
  recordingStatus = null,
  recordingBusy = false,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
}: MediaControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        disabled={disabled}
        className={`p-3 rounded-full transition-colors ${
          audioEnabled
            ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600'
            : 'bg-red-600 text-white hover:bg-red-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>
      {recordingStatus && <span role="status" aria-label={`Recording ${recordingStatus}`} className="inline-flex items-center gap-1.5 rounded-full bg-red-950/70 px-2.5 py-1 text-[11px] font-semibold text-red-200"><span className={`h-2 w-2 rounded-full ${recordingStatus === 'recording' ? 'animate-pulse bg-red-400' : 'bg-amber-400'}`} />{recordingStatus === 'recording' ? 'REC' : recordingStatus.replaceAll('_', ' ')}</span>}
      {isHost && !recordingStatus && <button type="button" disabled={disabled || recordingBusy} onClick={onStartRecording} className="rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-900/40 disabled:opacity-50">{recordingBusy ? 'Preparing…' : 'Start recording'}</button>}
      {isHost && recordingStatus === 'awaiting_consent' && <button type="button" disabled={recordingBusy} onClick={onStopRecording} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-100 disabled:opacity-50">Cancel recording request</button>}
      {isHost && recordingStatus === 'recording' && <><button type="button" disabled={recordingBusy} onClick={onPauseRecording} className="rounded-xl border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/40 disabled:opacity-50">Pause recording</button><button type="button" disabled={recordingBusy} onClick={onStopRecording} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">Stop recording</button></>}
      {isHost && recordingStatus === 'paused' && <><button type="button" disabled={recordingBusy} onClick={onResumeRecording} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-950/40 disabled:opacity-50">Resume recording</button><button type="button" disabled={recordingBusy} onClick={onStopRecording} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">Stop recording</button></>}
      {isHost && recordingStatus === 'processing' && <button type="button" disabled={recordingBusy} onClick={onStopRecording} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">Finish recording</button>}

      {/* Camera Toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        disabled={disabled}
        className={`p-3 rounded-full transition-colors ${
          videoEnabled
            ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )}
      </button>

      {/* Leave Button */}
      <button type="button" onClick={onToggleScreenShare} disabled={disabled} aria-label={screenSharing ? 'Stop sharing' : 'Start sharing'} title={screenSharing ? 'Stop sharing' : 'Share screen'} className={`p-3 rounded-full transition-colors ${screenSharing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600'} disabled:opacity-50`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="13" rx="2" strokeWidth="2"/><path d="M8 21h8m-4-4v4m-3-9 2-2 2 2m-2-2v5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button
        type="button"
        onClick={onLeave}
        disabled={disabled}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Leave Meeting
      </button>
      {isHost && <button type="button" onClick={onEndMeeting} disabled={disabled} className="rounded-xl border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50">End for everyone</button>}
    </div>
  );
}
