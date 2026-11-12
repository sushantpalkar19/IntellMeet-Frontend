import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useMeetingStore } from '../stores/meetingStore';
import { useChatStore } from '../stores/chatStore';
import { meetingApi } from '../services/meetingApi';
import type { MeetingRecording } from '../services/meetingApi';
import { startMedia, stopMedia, toggleAudio, toggleVideo, getMediaState, broadcastMediaState, setMediaStateChangeListener } from '../services/media';
import { setLocalMediaStream } from '../services/webrtc';
import ChatPanel from '../components/meetings/ChatPanel';
import MeetingInvitationPanel from '../components/meetings/MeetingInvitationPanel';
import VideoGrid from '../components/meetings/VideoGrid';
import MediaControls from '../components/meetings/MediaControls';
import EndMeetingConfirmation from '../components/meetings/EndMeetingConfirmation';
import ScreenShareStage from '../components/meetings/ScreenShareStage';
import { getSocket } from '../services/socket';
import { getDisplayStream, startScreenCapture, stopScreenCapture } from '../services/screenShare';
import TranscriptPanel from '../components/meetings/TranscriptPanel';
import MeetingNotesPanel from '../components/meetings/MeetingNotesPanel';
import { MeetingRecordingCapture } from '../services/recordingCapture';
import type { RecordingSource } from '../services/recordingCapture';

export default function MeetingRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isConnected, isConnecting, reconnectAttempts, connect } = useSocketStore();
  const {
    currentMeeting,
    isInRoom,
    isJoining,
    joinError,
    participants,
    remoteStreams,
    participantAudioEnabled,
    participantVideoEnabled,
    screenShare,
    joinRoom,
    leaveRoom,
    setCurrentMeeting,
    clearParticipants,
    clearRemoteStreams,
  } = useMeetingStore();
  const { clearMessages } = useChatStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [endConfirmationOpen, setEndConfirmationOpen] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [endMeetingError, setEndMeetingError] = useState<string | null>(null);
  const [recording, setRecording] = useState<MeetingRecording | null>(null);
  const [recordingConsentRequest, setRecordingConsentRequest] = useState<string | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const captureRef = useRef<MeetingRecordingCapture | null>(null);
  const endCleanupStarted = useRef(false);
  const closeShare = useCallback(() => setShareOpen(false), []);

  const recordingIsHost = currentMeeting?.createdBy === user?.id;
  const recordingSources: RecordingSource[] = [
    ...(localStream || displayStream ? [{ id: user?.id || 'local', name: `${user?.firstName || 'You'} ${user?.lastName || ''}`.trim(), stream: displayStream || localStream! }] : []),
    ...Array.from(remoteStreams.entries()).map(([id, stream]) => { const person = participants.get(id); return { id, name: person ? `${person.firstName} ${person.lastName}`.trim() : 'Participant', stream }; }),
  ];
  const activeRecordingStatus = recording && ['awaiting_consent', 'recording', 'paused', 'processing'].includes(recording.status) ? recording.status : null;

  const handleStartRecording = useCallback(async () => {
    if (!meetingId) return;
    const formats = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mimeType = formats.find((format) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(format))?.split(';')[0];
    if (!mimeType) { setRecordingError('This browser does not support a compatible recording format.'); return; }
    setRecordingBusy(true); setRecordingError(null);
    try { const result = await meetingApi.startRecording(meetingId, mimeType); setRecording(result.recording); }
    catch (error) { setRecordingError((error as any)?.response?.data?.message || 'Could not start recording.'); }
    finally { setRecordingBusy(false); }
  }, [meetingId]);

  const handleRecordingConsent = useCallback(async (consented: boolean) => {
    if (!meetingId || !recordingConsentRequest) return;
    try { const result = await meetingApi.consentToRecording(meetingId, recordingConsentRequest, consented); setRecording(result.recording); setRecordingConsentRequest(null); }
    catch (error) { setRecordingError((error as any)?.response?.data?.message || 'Could not save your recording consent.'); }
  }, [meetingId, recordingConsentRequest]);

  const handleRecordingControl = useCallback(async (action: 'pause' | 'resume' | 'stop') => {
    if (!meetingId || !recording) return;
    setRecordingBusy(true); setRecordingError(null);
    const capture = captureRef.current;
    try {
      if (action === 'pause') capture?.pause();
      if (action === 'resume') capture?.resume();
      if (action === 'stop' && capture) { captureRef.current = null; try { await capture.stopAndFlush(); } catch (error) { setRecordingError((error as Error).message); } }
      const result = await meetingApi.controlRecording(meetingId, recording.id, action);
      setRecording(result.recording);
    } catch (error) {
      if (action === 'pause') capture?.resume();
      if (action === 'resume') capture?.pause();
      setRecordingError((error as Error)?.message || (error as any)?.response?.data?.message || 'Could not update recording.');
    } finally { setRecordingBusy(false); }
  }, [meetingId, recording]);

  const cleanupAfterMeetingEnd = useCallback(async () => {
    if (endCleanupStarted.current) return;
    endCleanupStarted.current = true;
    setMediaStateChangeListener(null);
    const capture = captureRef.current; captureRef.current = null;
    if (capture) await capture.stopAndFlush().catch(() => undefined);
    leaveRoom(false);
    if (getDisplayStream()) await stopScreenCapture(null).catch(() => undefined);
    stopMedia();
    setLocalMediaStream(null);
    setLocalStream(null);
    setDisplayStream(null);
    clearParticipants();
    clearRemoteStreams();
    clearMessages();
    navigate(`/workspaces/${currentMeeting?.workspaceId ?? ''}`, { replace: true });
  }, [leaveRoom, clearParticipants, clearRemoteStreams, clearMessages, navigate, currentMeeting?.workspaceId]);

  const confirmEndMeeting = useCallback(async () => {
    if (!currentMeeting) return;
    setIsEndingMeeting(true);
    setEndMeetingError(null);
    try {
      if (recordingIsHost && recording && ['recording', 'paused', 'awaiting_consent'].includes(recording.status)) await handleRecordingControl('stop');
      await meetingApi.endMeeting(currentMeeting.id);
      await cleanupAfterMeetingEnd();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setEndMeetingError(error.response?.data?.message || 'Unable to end the meeting. Please try again.');
      setIsEndingMeeting(false);
    }
  }, [currentMeeting, cleanupAfterMeetingEnd, recordingIsHost, recording, handleRecordingControl]);

  const handleStopScreenShare = useCallback(async () => {
    if (!getDisplayStream()) return;
    try {
      await stopScreenCapture(getMediaState().stream);
      setDisplayStream(null);
      if (meetingId) getSocket()?.emit('screenshare:stop', { meetingId });
    } catch (err) {
      setMediaError((err as Error).message || 'Could not stop screen sharing cleanly.');
    }
  }, [meetingId]);

  const handleStartScreenShare = useCallback(async () => {
    if (!meetingId || getDisplayStream()) return;
    try {
      const stream = await startScreenCapture();
      setDisplayStream(stream);
      setMediaError(null);
      const track = stream.getVideoTracks()[0];
      track.addEventListener('ended', () => { void handleStopScreenShare(); }, { once: true });
      getSocket()?.emit('screenshare:start', { meetingId });
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') setMediaError('Screen sharing permission was denied. Allow screen capture in your browser and try again.');
      else if (error.name !== 'AbortError') setMediaError(error.message || 'Unable to start screen sharing.');
    }
  }, [handleStopScreenShare, meetingId]);

  // Load meeting details on mount
  useEffect(() => {
    setRecording(null); setRecordingConsentRequest(null); setRecordingError(null);
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;

    const loadMeeting = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await meetingApi.getMeeting(meetingId);
        setCurrentMeeting(response.meeting);
        setLoading(false);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || 'Failed to load meeting');
        setLoading(false);
      }
    };

    loadMeeting();
  }, [meetingId, setCurrentMeeting]);

  // Join socket room when socket is connected and meeting is loaded
  useEffect(() => {
    if (isConnected && meetingId && currentMeeting && !isInRoom && !isJoining) {
      joinRoom(meetingId);
    }
  }, [isConnected, meetingId, currentMeeting, isInRoom, isJoining, joinRoom]);

  useEffect(() => {
    if (!isInRoom || !meetingId) return;
    const state = getMediaState();
    broadcastMediaState(meetingId, state.audioEnabled, state.videoEnabled);
  }, [isInRoom, meetingId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleMeetingEnded = (payload: { meetingId: string }) => {
      if (payload.meetingId === meetingId) void cleanupAfterMeetingEnd();
    };
    const handleRoomRestored = (payload: { meetingId: string }) => {
      if (payload.meetingId === meetingId && getDisplayStream()) {
        socket.emit('screenshare:start', { meetingId });
      }
    };
    const handleScreenShareError = (payload: { message?: string }) => {
      setMediaError(payload.message || 'Screen sharing could not be started.');
      void stopScreenCapture(getMediaState().stream).finally(() => setDisplayStream(null));
    };
    const handleRecordingStatus = (payload: { meetingId: string; recording: MeetingRecording }) => {
      if (payload.meetingId === meetingId) {
        setRecording(payload.recording);
        if (['processing', 'completed', 'interrupted', 'consent_denied', 'failed'].includes(payload.recording.status)) setRecordingConsentRequest(null);
      }
    };
    const handleRecordingConsentRequest = (payload: { meetingId: string; recordingId: string }) => {
      if (payload.meetingId === meetingId && payload.recordingId) setRecordingConsentRequest(payload.recordingId);
    };
    socket.on('meeting:ended', handleMeetingEnded);
    socket.on('meeting:joined', handleRoomRestored);
    socket.on('screenshare:error', handleScreenShareError);
    socket.on('recording:status', handleRecordingStatus);
    socket.on('recording:consent-request', handleRecordingConsentRequest);
    return () => {
      socket.off('meeting:ended', handleMeetingEnded);
      socket.off('meeting:joined', handleRoomRestored);
      socket.off('screenshare:error', handleScreenShareError);
      socket.off('recording:status', handleRecordingStatus);
      socket.off('recording:consent-request', handleRecordingConsentRequest);
    };
  }, [meetingId, cleanupAfterMeetingEnd]);

  useEffect(() => {
    captureRef.current?.updateSources(recordingSources);
  }, [localStream, displayStream, remoteStreams, participants]);

  useEffect(() => {
    if (!recordingIsHost || !recording) return;
    if (recording.status === 'recording' && !captureRef.current && recordingSources.length) {
      const capture = new MeetingRecordingCapture(async (blob, sequence, startMs, endMs) => { await meetingApi.uploadRecordingChunk(meetingId!, recording.id, blob, { sequence, startMs, endMs }); }, { onError: setRecordingError });
      captureRef.current = capture;
      void capture.start(recordingSources).then(() => {
        if (captureRef.current !== capture) void capture.stopAndFlush().catch(() => undefined);
      }).catch(async (error: Error) => {
        setRecordingError(error.message || 'Could not start browser recording.');
        if (captureRef.current === capture) captureRef.current = null;
        capture.dispose();
        try { const result = await meetingApi.controlRecording(meetingId!, recording.id, 'stop'); setRecording(result.recording); } catch { /* status is recoverable through socket/reload */ }
      });
    } else if (recording.status === 'paused') captureRef.current?.pause();
    else if (recording.status === 'recording') captureRef.current?.resume();
    else if (recording.status === 'processing' && captureRef.current) {
      const capture = captureRef.current; captureRef.current = null;
      void capture.stopAndFlush().catch((error) => setRecordingError(error.message)).then(async () => {
        try { const result = await meetingApi.controlRecording(meetingId!, recording.id, 'stop'); setRecording(result.recording); }
        catch (error) { setRecordingError((error as any)?.response?.data?.message || 'Could not finish the recording.'); }
      });
    } else if (['completed', 'interrupted', 'consent_denied', 'failed'].includes(recording.status) && captureRef.current) {
      const capture = captureRef.current; captureRef.current = null; void capture.stopAndFlush().catch((error) => setRecordingError(error.message));
    }
  }, [recording, recordingIsHost, recordingSources, meetingId]);

  useEffect(() => {
    setMediaStateChangeListener((state) => {
      setLocalStream(state.stream);
      setAudioEnabled(state.audioEnabled);
      setVideoEnabled(state.videoEnabled);
      if (state.error) setMediaError(state.error);
      if (meetingId && isInRoom) broadcastMediaState(meetingId, state.audioEnabled, state.videoEnabled);
    });
    return () => setMediaStateChangeListener(null);
  }, [isInRoom, meetingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (getDisplayStream()) {
        getSocket()?.emit('screenshare:stop', { meetingId });
        void stopScreenCapture(getMediaState().stream);
      }
      const capture = captureRef.current; captureRef.current = null;
      if (capture) void capture.stopAndFlush().catch(() => undefined);
      setDisplayStream(null);
      leaveRoom();
      clearParticipants();
      clearMessages();
      clearRemoteStreams();
      stopMedia();
      setLocalMediaStream(null);
    };
  }, [leaveRoom, clearParticipants, clearMessages, clearRemoteStreams, meetingId]);

  // Handle media enable/disable
  const handleToggleAudio = () => {
    if (!getMediaState().stream?.getAudioTracks().some((track) => track.readyState === 'live')) {
      void handleEnableMedia();
      return;
    }
    toggleAudio();
    const state = getMediaState();
    setAudioEnabled(state.audioEnabled);
    if (meetingId && isInRoom) {
      broadcastMediaState(meetingId, state.audioEnabled, state.videoEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (!getMediaState().stream?.getVideoTracks().some((track) => track.readyState === 'live')) {
      void handleEnableMedia();
      return;
    }
    toggleVideo();
    const state = getMediaState();
    setVideoEnabled(state.videoEnabled);
    if (meetingId && isInRoom) {
      broadcastMediaState(meetingId, state.audioEnabled, state.videoEnabled);
    }
  };

  // Request media on join
  const handleEnableMedia = async () => {
    try {
      const stream = await startMedia(true, true);
      setLocalStream(stream);
      setLocalMediaStream(stream);
      const state = getMediaState();
      setAudioEnabled(state.audioEnabled);
      setVideoEnabled(state.videoEnabled);
      setMediaError(null);
      if (meetingId && isInRoom) {
        broadcastMediaState(meetingId, true, true);
      }
    } catch (err) {
      const error = err as Error;
      setMediaError(error.message);
    }
  };

  const handleLeave = async () => {
    if (recordingIsHost && recording && ['recording', 'paused', 'awaiting_consent'].includes(recording.status)) await handleRecordingControl('stop');
    const capture = captureRef.current; captureRef.current = null;
    if (capture) await capture.stopAndFlush().catch((error) => setRecordingError(error.message));
    if (getDisplayStream()) await stopScreenCapture(getMediaState().stream).catch(() => undefined);
    stopMedia();
    setLocalMediaStream(null);
    setLocalStream(null);
    leaveRoom();
    navigate('/workspaces');
  };

  const formatParticipantName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getConnectionStatusBadge = () => {
    if (isConnecting) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {reconnectAttempts > 0 || isInRoom ? 'Reconnecting...' : 'Connecting...'}
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Connected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Disconnected
      </span>
    );
  };

  const getMeetingStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
            Scheduled
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Ended
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-[3px] border-[#6D28D9] border-t-transparent animate-spin" />
          <p className="mt-4 text-sm text-[#64748B] dark:text-slate-400 font-medium">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#151522] rounded-2xl p-6 shadow-sm border border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Error Loading Meeting</h2>
          </div>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/workspaces')}
            className="w-full px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  if (!currentMeeting) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] text-slate-100">
      {/* Header */}
      <header className="bg-[#11121B] border-b border-white/10 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between min-h-16 gap-3 py-2">
            {/* Left: Meeting Info */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(`/workspaces/${currentMeeting.workspaceId}`)}
                className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                aria-label="Back to workspace"
              >
                <svg className="w-5 h-5 text-[#64748B] dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-semibold text-white">{currentMeeting.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {getMeetingStatusBadge(currentMeeting.status)}
                  <span className="text-xs text-[#64748B] dark:text-slate-400">
                    {participants.size + (user ? 1 : 0)} participant{participants.size + (user ? 1 : 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Connection Status & Leave Button */}
            <div className="flex items-center gap-3">
              {getConnectionStatusBadge()}
              {!isConnected && !isConnecting && <button type="button" onClick={connect} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">Reconnect</button>}
              {currentMeeting.createdBy === user?.id && <button type="button" onClick={() => setShareOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-600" aria-label="Share meeting" title="Share meeting"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path strokeWidth="2" d="m8.7 10.7 6.6-4.4m-6.6 9.4 6.6 2.8"/></svg></button>}
              <MediaControls
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
                screenSharing={Boolean(displayStream)}
                onToggleScreenShare={displayStream ? handleStopScreenShare : handleStartScreenShare}
                onLeave={handleLeave}
                isHost={currentMeeting.createdBy === user?.id}
                onEndMeeting={() => { setEndMeetingError(null); setEndConfirmationOpen(true); }}
                recordingStatus={activeRecordingStatus}
                recordingBusy={recordingBusy}
                onStartRecording={() => void handleStartRecording()}
                onPauseRecording={() => void handleRecordingControl('pause')}
                onResumeRecording={() => void handleRecordingControl('resume')}
                onStopRecording={() => void handleRecordingControl('stop')}
                disabled={isJoining || !isInRoom}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full px-3 py-4 sm:px-5 lg:px-6">
        {recordingError && <div role="alert" className="mx-auto mb-3 max-w-6xl rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-2 text-sm text-red-200">{recordingError}</div>}
        {recordingIsHost && !activeRecordingStatus && recordingSources.length === 0 && <p className="mx-auto mb-3 max-w-6xl text-xs text-slate-400">Enable your microphone/camera or wait for participant media before starting a recording.</p>}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 h-[calc(100vh-6rem)] min-h-[620px]">
          {/* Left: Meeting Info & Video Placeholder */}
          <div className="min-w-0">
            <div className="h-full bg-[#151622] rounded-2xl p-4 sm:p-5 shadow-sm border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Meeting room</h2>
                {isJoining && (
                  <span className="text-xs text-[#64748B] dark:text-slate-400">Joining room...</span>
                )}
              </div>

              {/* Video Grid */}
              <div className="flex-1 min-h-[320px] bg-[#090A10] rounded-xl overflow-hidden">
                {screenShare ? (
                  <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="min-h-0 flex-1">
                      <ScreenShareStage
                        stream={screenShare.userId === user?.id ? displayStream : remoteStreams.get(screenShare.userId) ?? null}
                        presenterName={screenShare.userName}
                        isLocal={screenShare.userId === user?.id}
                        onStop={screenShare.userId === user?.id ? handleStopScreenShare : undefined}
                      />
                    </div>
                    {(localStream || remoteStreams.size > 0) && <div className="h-28 shrink-0 overflow-hidden rounded-xl"><VideoGrid
                      localStream={localStream}
                      participants={participants}
                      remoteStreams={remoteStreams}
                      localAudioEnabled={audioEnabled}
                      localVideoEnabled={videoEnabled}
                      participantAudioEnabled={participantAudioEnabled}
                      participantVideoEnabled={participantVideoEnabled}
                    /></div>}
                  </div>
                ) : localStream || remoteStreams.size > 0 ? (
                  <VideoGrid
                    localStream={localStream}
                    participants={participants}
                    remoteStreams={remoteStreams}
                    localAudioEnabled={audioEnabled}
                    localVideoEnabled={videoEnabled}
                    participantAudioEnabled={participantAudioEnabled}
                    participantVideoEnabled={participantVideoEnabled}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      {!localStream && (
                        <button
                          type="button"
                          onClick={handleEnableMedia}
                          className="px-6 py-3 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-sm font-semibold transition-colors mb-4"
                        >
                          Enable Camera & Microphone
                        </button>
                      )}
                      {mediaError && (
                        <p className="text-sm text-red-500 mb-3">{mediaError}</p>
                      )}
                      <p className="text-sm text-slate-400">
                        {localStream ? 'Waiting for participants...' : 'Enable media to start video'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Meeting Description */}
              <div className="mt-4 shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</h3>
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                  {currentMeeting.description || 'No description provided.'}
                </p>
              </div>

              {/* Join Error */}
              {joinError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{joinError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Participant List & Chat */}
          <div className="min-h-0 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
            {/* Participant List */}
            <div className="shrink-0 bg-[#151622] rounded-2xl p-4 shadow-sm border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Participants</h2>
                <span className="text-xs text-[#64748B] dark:text-slate-400">
                  {participants.size + (user ? 1 : 0)} in room
                </span>
              </div>

              {/* Current User */}
              {user && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-sm">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {formatParticipantName(user.firstName, user.lastName)}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">You</p>
                  </div>
                </div>
              )}

              {/* Other Participants */}
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {Array.from(participants.values())
                  .filter((p) => p.userId !== user?.id)
                  .map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {getInitials(participant.firstName, participant.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                          {formatParticipantName(participant.firstName, participant.lastName)}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                          {participant.email}
                        </p>
                      </div>
                    </div>
                  ))}

                {participants.size === 0 && !isJoining && (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#64748B] dark:text-slate-400">No other participants yet</p>
                  </div>
                )}

                {isJoining && participants.size === 0 && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto rounded-full border-[3px] border-[#6D28D9] border-t-transparent animate-spin" />
                    <p className="mt-3 text-sm text-[#64748B] dark:text-slate-400">Joining room...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Panel */}
            {meetingId && <ChatPanel meetingId={meetingId} />}
            {meetingId && <TranscriptPanel meetingId={meetingId} microphoneTrack={localStream?.getAudioTracks().find((track) => track.readyState === 'live') ?? null} microphoneEnabled={audioEnabled} isHost={currentMeeting?.createdBy === user?.id} />}
            {meetingId && currentMeeting && <MeetingNotesPanel meetingId={meetingId} meetingTitle={currentMeeting.title} />}
          </div>
        </div>
      </main>
      {shareOpen && currentMeeting.createdBy === user?.id && <MeetingInvitationPanel meetingId={currentMeeting.id} meetingTitle={currentMeeting.title} onClose={closeShare} />}
      {recordingConsentRequest && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-labelledby="recording-consent-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151622] p-6 text-slate-100 shadow-2xl"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-300"><span className="h-3 w-3 animate-pulse rounded-full bg-red-400" /></span><div><h2 id="recording-consent-title" className="text-lg font-semibold">Recording consent</h2><p className="text-xs text-slate-400">{currentMeeting.title}</p></div></div><p className="text-sm leading-6 text-slate-300">The meeting host wants to record the audio and video currently available in their browser. The recording may include your audio/video and screen share while you are connected. Your consent is required before recording resumes.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => void handleRecordingConsent(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Decline</button><button type="button" onClick={() => void handleRecordingConsent(true)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold">Allow recording</button></div></section></div>}
      {currentMeeting.createdBy === user?.id && <EndMeetingConfirmation meetingTitle={currentMeeting.title} isOpen={endConfirmationOpen} isEnding={isEndingMeeting} error={endMeetingError} onCancel={() => setEndConfirmationOpen(false)} onConfirm={() => void confirmEndMeeting()} />}
    </div>
  );
}
