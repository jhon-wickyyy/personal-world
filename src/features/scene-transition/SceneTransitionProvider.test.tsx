import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SceneTransitionProvider, useSceneTransition } from './SceneTransitionProvider';
import type { SceneTransitionContextValue } from './types';

function TransitionProbe({ onReady }: { onReady: (value: SceneTransitionContextValue) => void }) {
  const value = useSceneTransition();
  useEffect(() => onReady(value), [onReady, value]);
  return null;
}

describe('SceneTransitionProvider', () => {
  it('navigates immediately when reduced motion is requested', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    try {
      let context: SceneTransitionContextValue | null = null;
      const onReady = (value: SceneTransitionContextValue) => { context = value; };
      const onCover = vi.fn();
      const view = render(
        <SceneTransitionProvider>
          <TransitionProbe onReady={onReady} />
        </SceneTransitionProvider>
      );

      await act(async () => {
        await context!.transitionTo({ label: 'About', onCover });
      });

      expect(onCover).toHaveBeenCalledTimes(1);
      view.unmount();
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    }
  });
});
