import { getLocalMediaStream, replaceLocalVideoTrack } from './webrtc';

let displayStream: MediaStream | null = null;

export function getDisplayStream(): MediaStream | null {
  return displayStream;
}

/** Must be called directly from a user gesture because browsers gate display capture. */
export async function startScreenCapture(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen sharing is not supported by this browser.');
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const track = stream.getVideoTracks()[0];
  if (!track) {
    stream.getTracks().forEach((item) => item.stop());
    throw new Error('No screen or window was selected for sharing.');
  }
  try {
    await replaceLocalVideoTrack(track, stream);
    displayStream = stream;
    return stream;
  } catch (error) {
    const cameraStream = getLocalMediaStream();
    const cameraTrack = cameraStream?.getVideoTracks().find((item) => item.readyState === 'live') ?? null;
    try { await replaceLocalVideoTrack(cameraTrack, cameraStream ?? undefined, false); } catch { /* preserve the original capture error */ }
    stream.getTracks().forEach((item) => item.stop());
    throw error;
  }
}

/** Restore the camera sender before stopping display capture. Safe to call repeatedly. */
export async function stopScreenCapture(cameraStream: MediaStream | null): Promise<void> {
  const stream = displayStream;
  if (!stream) return;
  displayStream = null;
  const cameraTrack = cameraStream?.getVideoTracks().find((track) => track.readyState === 'live') ?? null;
  await replaceLocalVideoTrack(cameraTrack, cameraStream ?? undefined, false);
  stream.getTracks().forEach((track) => track.stop());
}
