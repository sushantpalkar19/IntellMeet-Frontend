import { useEffect, useRef } from 'react';

interface RemoteVideoProps {
  stream: MediaStream | null;
  userName: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  className?: string;
}

export default function RemoteVideo({
  stream,
  userName,
  isAudioEnabled = true,
  isVideoEnabled = true,
  className = '',
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;

    if (stream) {
      video.srcObject = stream;
      
      video.play().catch((error) => {
        if (!active && error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error playing remote video:', error);
      });
    } else {
      video.srcObject = null;
    }

    return () => {
      active = false;
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative w-full h-full bg-slate-900 rounded-xl overflow-hidden ${className}`}>
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-2xl">
            {getInitials(userName)}
          </div>
        </div>
      )}

      {/* User Name Badge */}
      <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
        <p className="text-sm font-semibold text-white">{userName}</p>
      </div>

      {/* Audio Muted Indicator */}
      {!isAudioEnabled && (
        <div className="absolute top-3 right-3 bg-red-500 p-2 rounded-full">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )}

      {/* Video Disabled Indicator */}
      {!isVideoEnabled && (
        <div className="absolute top-3 right-3 bg-blue-500 p-2 rounded-full">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
