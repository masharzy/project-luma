"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

/**
 * Seekable, theme-matched audio controls for PRACTICE listening only
 * (Cambridge, Other Books, Recent Tests). Never rendered for mocks.
 */
export function PracticeAudioBar({
  audioRef,
  sourceKey,
  onPlayRequest,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  sourceKey: string;
  onPlayRequest: () => void;
}) {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const sync = () => {
      setTime(a.currentTime || 0);
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      setPlaying(!a.paused && !a.ended);
    };
    const events = ["timeupdate", "loadedmetadata", "durationchange", "play", "playing", "pause", "ended", "seeked", "emptied"];
    events.forEach(e => a.addEventListener(e, sync));
    sync();
    return () => events.forEach(e => a.removeEventListener(e, sync));
  }, [audioRef, sourceKey]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) onPlayRequest();
    else a.pause();
  }, [audioRef, onPlayRequest]);

  const seekTo = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration)) return;
    a.currentTime = Math.max(0, Math.min(a.duration, t));
    setTime(a.currentTime);
  }, [audioRef]);

  const skip = (d: number) => seekTo((audioRef.current?.currentTime || 0) + d);
  const left = Math.max(0, duration - time);
  const minsLeft = Math.ceil(left / 60);

  return (
    <div className="ielts-audio-bar" role="group" aria-label="Audio player">
      <button type="button" className="ielts-audio-btn" onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10s"><RotateCcw size={15} /><i>10</i></button>
      <button type="button" className="ielts-audio-btn ielts-audio-main" onClick={toggle} aria-label={playing ? "Pause audio" : "Play audio"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button type="button" className="ielts-audio-btn" onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10s"><RotateCw size={15} /><i>10</i></button>
      <span className="ielts-audio-time" aria-live="off">{fmt(time)}</span>
      <input
        className="ielts-audio-seek"
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={Math.min(time, duration || 0)}
        disabled={!duration}
        onChange={e => seekTo(Number(e.target.value))}
        aria-label="Seek audio"
        aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
        style={{ ["--p" as string]: duration ? `${(time / duration) * 100}%` : "0%" }}
      />
      <span className="ielts-audio-time">{fmt(duration)}</span>
      <span className="ielts-audio-left">{duration ? (minsLeft <= 1 ? "<1 min left" : `${minsLeft} min left`) : "Loading…"}</span>
      <Volume2 size={14} aria-hidden="true" className="ielts-audio-vol-icon" />
      <input
        className="ielts-audio-volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={e => { const v = Number(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
        aria-label="Volume"
      />
    </div>
  );
}
