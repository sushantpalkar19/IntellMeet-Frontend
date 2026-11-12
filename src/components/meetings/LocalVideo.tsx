import { useEffect, useRef } from 'react';

interface LocalVideoProps {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}

export default function LocalVideo({ stream, muted = true, className = '' }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;

    if (stream) {
      video.srcObject = stream;
      
      // Autoplay with muted (required for autoplay)
      video.muted = muted;
      video.play().catch((error) => {
        if (!active && error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error playing local video:', error);
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
  }, [stream, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
