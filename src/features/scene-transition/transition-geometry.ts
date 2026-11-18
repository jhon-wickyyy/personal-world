import type { TransitionOrigin, TransitionPoint } from './types';

export function resolveTransitionPoint(
  origin: TransitionOrigin,
  viewport: Pick<Window, 'innerWidth' | 'innerHeight'>
): TransitionPoint {
  if (origin && typeof (origin as Element).getBoundingClientRect === 'function') {
    const rect = (origin as Element).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  if (origin && typeof origin === 'object' && 'x' in origin && 'y' in origin) {
    const point = origin as TransitionPoint;
    return {
      x: Math.max(0, Math.min(viewport.innerWidth, point.x)),
      y: Math.max(0, Math.min(viewport.innerHeight, point.y)),
    };
  }

  return { x: viewport.innerWidth / 2, y: viewport.innerHeight / 2 };
}

export function getCoverRadius(point: TransitionPoint, width: number, height: number): number {
  const farthestX = Math.max(point.x, width - point.x);
  const farthestY = Math.max(point.y, height - point.y);
  return Math.ceil(Math.hypot(farthestX, farthestY) + 80);
}
