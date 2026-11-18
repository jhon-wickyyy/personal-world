/**
 * Lightbox: full-size viewing for portfolio images.
 *
 * Click any image to open it; arrow keys / buttons step through the group,
 * Escape closes. No dependency, no layout shift, respects reduced motion.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { MediaItem } from './ui';

export interface LightboxState {
  items: MediaItem[];
  index: number;
  label: string;
}

export function Lightbox({
  state,
  onClose,
  onChange,
}: {
  state: LightboxState | null;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = state?.items.length ?? 0;

  const step = useCallback(
    (delta: number) => {
      if (!state || count === 0) return;
      onChange((state.index + delta + count) % count);
    },
    [state, count, onChange]
  );

  useEffect(() => {
    if (!state) return undefined;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [state, onClose, step]);

  if (!state) return null;
  const item = state.items[state.index];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${state.label} image ${state.index + 1} of ${count}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      data-testid="lightbox"
    >
      <div className="lightbox__bar">
        <span className="lightbox__counter">
          {String(state.index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <span className="lightbox__label">{item.caption ?? state.label}</span>
        <button ref={closeRef} type="button" className="button button--quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="lightbox__stage">
        <img className="lightbox__image" src={item.src} alt={item.caption ?? state.label} />
      </div>

      {count > 1 ? (
        <div className="lightbox__nav">
          <button type="button" className="button" onClick={() => step(-1)} aria-label="Previous image">
            ‹
          </button>
          <button type="button" className="button" onClick={() => step(1)} aria-label="Next image">
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
