import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;
function loadYT(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

const QUALITY_LABEL: Record<string, string> = {
  highres: "4K+",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
  auto: "Auto",
  default: "Auto",
};

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  const m = Math.floor((t / 60) % 60);
  const h = Math.floor(t / 3600);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [qualities, setQualities] = useState<string[]>([]);
  const [quality, setQuality] = useState<string>("auto");
  const [showQuality, setShowQuality] = useState(false);
  const [ready, setReady] = useState(false);
  const [showCtl, setShowCtl] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    let destroyed = false;
    loadYT().then((YT) => {
      if (destroyed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            setReady(true);
            setDuration(e.target.getDuration());
            setVolume(e.target.getVolume());
            const qs: string[] = e.target.getAvailableQualityLevels?.() || [];
            setQualities(qs);
          },
          onStateChange: (e: any) => {
            const YTS = window.YT.PlayerState;
            if (e.data === YTS.PLAYING) {
              setPlaying(true);
              setDuration(e.target.getDuration());
              const qs: string[] = e.target.getAvailableQualityLevels?.() || [];
              if (qs.length) setQualities(qs);
            } else if (e.data === YTS.PAUSED || e.data === YTS.ENDED) {
              setPlaying(false);
            }
          },
          onPlaybackQualityChange: (e: any) => setQuality(e.data),
        },
      });
    });
    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setCurrent(p.getCurrentTime());
      if (!duration) setDuration(p.getDuration());
    }, 500);
    return () => clearInterval(id);
  }, [ready, duration]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };
  const onVolume = (v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
    if (v === 0) {
      playerRef.current?.mute();
      setMuted(true);
    } else if (muted) {
      playerRef.current?.unMute();
      setMuted(false);
    }
  };
  const onSeek = (t: number) => {
    setCurrent(t);
    playerRef.current?.seekTo(t, true);
  };
  const setQ = (q: string) => {
    setQuality(q);
    setShowQuality(false);
    try {
      playerRef.current?.setPlaybackQuality(q);
    } catch {}
  };
  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const wakeControls = () => {
    setShowCtl(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowCtl(false);
    }, 2500);
  };

  return (
    <div
      ref={wrapRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black select-none"
      onMouseMove={wakeControls}
      onMouseLeave={() => playing && setShowCtl(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={hostRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      {/* overlay swallows clicks so YouTube UI never receives them */}
      <div
        className="absolute inset-0"
        onClick={togglePlay}
        onDoubleClick={fullscreen}
        title={title}
      />
      {/* top gradient hides any residual top branding */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
      {/* center play button when paused */}
      {!playing && ready && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white hover:bg-black/80"
          aria-label="Play"
        >
          <Play className="h-7 w-7 fill-white" />
        </button>
      )}
      {/* bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-3 pt-8 pb-2 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${
          showCtl || !playing ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1 accent-primary cursor-pointer"
        />
        <div className="mt-2 flex items-center gap-3 text-white text-xs">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="w-20 h-1 accent-primary cursor-pointer"
          />
          <span className="tabular-nums">
            {fmt(current)} / {fmt(duration)}
          </span>
          <div className="ml-auto flex items-center gap-2 relative">
            <button
              onClick={() => setShowQuality((s) => !s)}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
              aria-label="Quality"
            >
              <Settings className="h-4 w-4" />
              <span>{QUALITY_LABEL[quality] || quality}</span>
            </button>
            {showQuality && (
              <div className="absolute bottom-9 right-0 min-w-[120px] rounded-lg border border-white/10 bg-black/95 p-1 shadow-xl">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/50">
                  Resolusi
                </div>
                {(qualities.length ? [...qualities, "default"] : ["default"]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQ(q)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/10 ${
                      quality === q ? "text-primary" : "text-white"
                    }`}
                  >
                    {QUALITY_LABEL[q] || q}
                  </button>
                ))}
              </div>
            )}
            <button onClick={fullscreen} aria-label="Fullscreen">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}