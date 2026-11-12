import { useAuthStore } from '../../stores/authStore';
import LocalVideo from './LocalVideo';
import RemoteVideo from './RemoteVideo';
import type { Participant } from '../../types/meeting';

interface VideoGridProps {
  localStream: MediaStream | null;
  participants: Map<string, Participant>;
  remoteStreams: Map<string, MediaStream>;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  participantAudioEnabled: Map<string, boolean>;
  participantVideoEnabled: Map<string, boolean>;
}

export default function VideoGrid({
  localStream,
  participants,
  remoteStreams,
  localAudioEnabled,
  localVideoEnabled,
  participantAudioEnabled,
  participantVideoEnabled,
}: VideoGridProps) {
  const { user } = useAuthStore();
  const participantList = Array.from(participants.values());
  const totalParticipants = participantList.length + 1; // +1 for local user

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 w-full h-full`}>
      {/* Local Video */}
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
        {localStream && localVideoEnabled ? (
          <LocalVideo stream={localStream} muted />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-800">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-2xl mb-3">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <p className="text-white font-semibold">You</p>
              {!localVideoEnabled && (
                <p className="text-sm text-purple-200 mt-1">Camera off</p>
              )}
            </div>
          </div>
        )}

        {/* Local Audio Muted Indicator */}
        {!localAudioEnabled && (
          <div className="absolute top-3 right-3 bg-red-500 p-2 rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
        )}

        {/* Local Video Disabled Indicator */}
        {!localVideoEnabled && (
          <div className="absolute top-3 right-3 bg-blue-500 p-2 rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Remote Videos */}
      {participantList.map((participant) => {
        const stream = remoteStreams.get(participant.userId) || null;
        const audioEnabled = participantAudioEnabled.get(participant.userId) ?? true;
        const videoEnabled = participantVideoEnabled.get(participant.userId) ?? true;
        const name = `${participant.firstName} ${participant.lastName}`;

        return (
          <div key={participant.userId} className="relative aspect-video">
            <RemoteVideo
              stream={stream}
              userName={name}
              isAudioEnabled={audioEnabled}
              isVideoEnabled={videoEnabled}
            />
          </div>
        );
      })}
    </div>
  );
}
