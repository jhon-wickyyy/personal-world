import { useEffect, useRef, type ReactNode } from 'react';
import type { ContentField } from '../content/types';
import { isReady } from '../content/types';

/** Visible placeholder for anything the owner has not supplied yet. */
export function ContentPending({
  label,
  source,
  compact = false,
}: {
  label: string;
  source?: string;
  compact?: boolean;
}) {
  return (
    <div className={`pending ${compact ? 'pending--compact' : ''}`} role="note">
      <span className="pending__flag">CONTENT_PENDING</span>
      <span className="pending__label">{label}</span>
      {source ? <span className="pending__source">{source}</span> : null}
    </div>
  );
}

/** Renders the value when READY, otherwise the pending placeholder. */
export function Field<T>({
  field,
  label,
  source,
  compact,
  children,
}: {
  field: ContentField<T>;
  label: string;
  source?: string;
  compact?: boolean;
  children?: (value: T) => ReactNode;
}) {
  if (!isReady(field)) return <ContentPending label={label} source={source ?? field.source} compact={compact} />;
  if (children) return <>{children(field.value)}</>;
  return <>{String(field.value)}</>;
}

export function StatusChip({ status }: { status: 'READY' | 'CONTENT_PENDING' }) {
  return (
    <span className={`chip ${status === 'READY' ? 'chip--ready' : 'chip--pending'}`}>
      {status === 'READY' ? 'ready' : 'pending'}
    </span>
  );
}

/** Accessible modal: focus trap, ESC to close, restored focus on close. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>('[data-autofocus]')?.focus() ?? node?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      (previouslyFocused.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialogRef}
        data-testid="modal"
      >
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="button button--quiet" onClick={onClose} data-autofocus>
            Close
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export type MediaKind = 'image' | 'video';

export interface MediaItem {
  kind: MediaKind;
  src: string;
  poster?: string;
  caption?: string;
}

/**
 * One media frame. When the owner has not supplied the asset it renders an
 * outlined frame at the right aspect ratio with a quiet label — never a
 * placeholder photograph and never a broken <img>.
 */
export function MediaFrame({
  item,
  index,
  ratio = '4 / 3',
  label,
  priority = false,
}: {
  item: MediaItem | null;
  index: number;
  ratio?: string;
  label: string;
  priority?: boolean;
}) {
  const n = String(index + 1).padStart(2, '0');

  if (!item) {
    return (
      <figure className="media">
        <div className="media__frame media__frame--empty" style={{ aspectRatio: ratio }} aria-hidden="true">
          <span className="media__index">{n}</span>
        </div>
        <figcaption className="media__caption">
          slot {n} · {label}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="media">
      <div className="media__frame" style={{ aspectRatio: ratio }}>
        {item.kind === 'video' ? (
          <video
            className="media__el"
            src={item.src}
            poster={item.poster}
            controls
            playsInline
            preload={priority ? 'metadata' : 'none'}
          />
        ) : (
          <img
            className="media__el"
            src={item.src}
            alt={item.caption ?? `${label} ${n}`}
            loading={priority ? 'eager' : 'lazy'}
          />
        )}
      </div>
      <figcaption className="media__caption">{item.caption ?? `slot ${n} · ${label}`}</figcaption>
    </figure>
  );
}

/**
 * Gallery: a responsive grid of MediaFrames. `items: null` means the owner has
 * not supplied imagery yet, so the grid shows empty frames of the right shape.
 */
export function Gallery({
  items,
  label,
  expected = 6,
  ratio = '4 / 3',
  columns,
}: {
  items: MediaItem[] | null;
  label: string;
  expected?: number;
  ratio?: string;
  columns?: string;
}) {
  const count = items?.length ?? expected;
  return (
    <div
      className="gallery"
      style={columns ? { gridTemplateColumns: columns } : undefined}
      data-testid={items ? 'gallery' : 'gallery-pending'}
    >
      {Array.from({ length: count }, (_, i) => (
        <MediaFrame
          key={items?.[i]?.src ?? `slot-${i}`}
          item={items?.[i] ?? null}
          index={i}
          ratio={ratio}
          label={label}
          priority={i === 0}
        />
      ))}
      {items ? null : (
        <div className="gallery__note">
          <ContentPending label={label} source="image / video files" compact />
        </div>
      )}
    </div>
  );
}
