import { describe, expect, it } from 'vitest';
import { getCoverRadius, resolveTransitionPoint } from './transition-geometry';

describe('scene transition geometry', () => {
  it('uses the centre of a visible portal element', () => {
    const portal = document.createElement('div');
    portal.getBoundingClientRect = () => ({
      x: 40, y: 80, left: 40, top: 80, right: 100, bottom: 160, width: 60, height: 80,
      toJSON: () => ({}),
    });
    expect(resolveTransitionPoint(portal, { innerWidth: 390, innerHeight: 844 })).toEqual({ x: 70, y: 120 });
  });

  it('falls back to the viewport centre when no portal is supplied', () => {
    expect(resolveTransitionPoint(null, { innerWidth: 1200, innerHeight: 800 })).toEqual({ x: 600, y: 400 });
  });

  it('clamps explicit transition points to the viewport', () => {
    expect(resolveTransitionPoint({ x: 1400, y: -20 }, { innerWidth: 1200, innerHeight: 800 })).toEqual({ x: 1200, y: 0 });
  });

  it('covers the farthest viewport corner with a safety margin', () => {
    expect(getCoverRadius({ x: 600, y: 400 }, 1200, 800)).toBeGreaterThan(Math.hypot(600, 400));
  });
});
