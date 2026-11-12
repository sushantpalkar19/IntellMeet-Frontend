import LocalVideo from './LocalVideo';

interface ScreenShareStageProps {
  stream: MediaStream | null;
  presenterName: string;
  isLocal?: boolean;
  onStop?: () => void;
}

export default function ScreenShareStage({ stream, presenterName, isLocal = false, onStop }: ScreenShareStageProps) {
  return <div className="relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden rounded-xl bg-black">
    {stream?.getVideoTracks().length ? <LocalVideo stream={stream} muted={isLocal} className="object-contain" /> : <p className="text-sm text-slate-400">Connecting to {presenterName}&apos;s screen…</p>}
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
      <div className="flex items-center gap-2 text-sm font-medium text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{presenterName} is presenting</div>
      {isLocal && onStop && <button type="button" onClick={onStop} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Stop sharing</button>}
    </div>
  </div>;
}
