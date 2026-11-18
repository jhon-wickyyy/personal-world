/**
 * VideoHero — the Travel world's video主视觉.
 *
 * Rules baked in:
 *   - always muted on start; autoplay never carries sound
 *   - loop + playsInline so it behaves on iOS
 *   - if autoplay is blocked (browser policy, save-data, low power) a real
 *     play button appears instead of a dead frame
 *   - when no film has been supplied it renders a restrained spec plate, never
 *     a fabricated video and never a blank box
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from './ui';

export interface VideoHeroProps {
  item: MediaItem | null;
  label: string;
  ratio?: string;
  className?: string;
}

export function VideoHero({ item, label, ratio = '21 / 9', className = '' }: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  /* try to autoplay, muted, once the element exists */
  useEffect(() => {
    const video = videoRef.current;
    if (!item || !video) return;
    video.muted = true;
    const attempt = video.play?.();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [item]);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const p = video.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => setBlocked(true));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  if (!item) {
    return (
      <figure className={`video-hero ${className}`} data-testid="video-hero-pending">
        <div className="video-hero__frame video-hero__frame--empty" style={{ aspectRatio: ratio }}>
          <div className="video-hero__spec">
            <span className="video-hero__line">
              <span className="video-hero__tag">video</span>
              muted · loop · playsInline
            </span>
            <span className="video-hero__glyph" aria-hidden="true" />
            <span className="video-hero__caption">no film supplied yet</span>
          </div>
          <span className="video-hero__corner" aria-hidden="true">
            21:9
          </span>
        </div>
        <figcaption className="video-hero__meta">
          {label} · CONTENT_PENDING
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={`video-hero ${className}`} data-testid="video-hero">
      <div className="video-hero__frame" style={{ aspectRatio: ratio }}>
        <video
          ref={videoRef}
          className="video-hero__video"
          src={item.src}
          poster={item.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={item.caption ?? label}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {blocked || !playing ? (
          <button
            type="button"
            className="video-hero__play"
            onClick={toggle}
            aria-label={blocked ? `Play ${label} (autoplay was blocked)` : `Play ${label}`}
          >
            <span aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          className="video-hero__mute"
          onClick={toggleMute}
          aria-pressed={!muted}
          aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
        >
          {muted ? 'sound off' : 'sound on'}
        </button>
      </div>
      {item.caption ? <figcaption className="video-hero__meta">{item.caption}</figcaption> : null}
    </figure>
  );
}
