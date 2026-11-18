import { describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { HomeWorldView } from './HomeWorldView';
import type { HomeWorldHandle } from './types';
import worldSvg from '../../world/HOME_WORLD.svg?raw';
import { homeWorldRoutes, routeNodeIds } from '../../world/src/content/home-world-routes.js';

/**
 * Integration tests for the frozen Home World module inside the site shell.
 *
 * They assert the module's *contract*, not its pixels: the SVG is inline (never
 * <img>), it carries the SVG namespace, every portal/mechanism is present, and
 * puzzle state survives an unmount/remount cycle -which is exactly what
 * navigating away from "/" and back does.
 */
const mount = () => {
  const handle: { current: HomeWorldHandle | null } = { current: null };
  const view = render(
    <HomeWorldView onPortalActivate={() => {}} onReady={(h) => { handle.current = h; }} />
  );
  const root = view.getByTestId('home-world-view');
  return { ...view, root, handle };
};

describe('Home World integration', () => {
  it('inlines the SVG with the correct namespace (not an <img>)', async () => {
    const { root } = mount();
    await waitFor(() => expect(root.querySelector('#world-home')).toBeTruthy());
    const svg = root.querySelector('#world-home')!;
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(root.querySelectorAll('img')).toHaveLength(0);
  });

  it('keeps the frozen asset inventory: 7 portals, 4 mechanisms, 4 gated bridges', async () => {
    const { root } = mount();
    await waitFor(() => expect(root.querySelectorAll('.portal')).toHaveLength(7));
    expect(root.querySelectorAll('.mechanism')).toHaveLength(4);
    const expectedNodes = new Set(Object.keys(homeWorldRoutes).flatMap((key) => routeNodeIds(key))).size;
    expect(root.querySelectorAll('.walk-node')).toHaveLength(expectedNodes);
    for (const id of ['world-home', 'world-island-central', 'world-portal-about', 'world-bridge-github-b']) {
      expect(root.querySelector(`#${id}`), id).toBeTruthy();
    }
  });

  it('starts with the three near portals locked and four bridges hidden', async () => {
    const { root } = mount();
    await waitFor(() => expect(root.querySelectorAll('.portal.is-locked')).toHaveLength(3));
    const gated = [...root.querySelectorAll('.bridge-ground[data-gate]')].filter(
      (el) => (el.getAttribute('data-gate') || '').length > 0
    );
    expect(gated).toHaveLength(4);
    expect(gated.every((el) => !el.classList.contains('is-open'))).toBe(true);
  });

  it('applies a puzzle through the runtime and keeps it across remount', async () => {
    const first = mount();
    await waitFor(() => expect(first.root.querySelectorAll('.portal')).toHaveLength(7));
    await waitFor(() => expect(first.handle.current).not.toBeNull());

    act(() => first.handle.current!.togglePuzzle('world-puzzle-about'));

    expect(first.root.querySelector('#world-bridge-about')!.classList.contains('is-open')).toBe(true);
    expect(first.root.querySelector('#world-mechanism-about')!.getAttribute('aria-pressed')).toBe('true');

    first.unmount();

    /* remount = navigating back to "/" */
    const second = mount();
    await waitFor(() => expect(second.root.querySelectorAll('.portal')).toHaveLength(7));
    expect(second.root.querySelector('#world-bridge-about')!.classList.contains('is-open')).toBe(true);
    expect(second.root.querySelector('#world-mechanism-about')!.classList.contains('is-solved')).toBe(true);
  });

  it('exposes the runtime handle to the shell', async () => {
    const { handle } = mount();
    await waitFor(() => expect(handle.current).not.toBeNull());
    const api = handle.current!;
    expect(Object.keys(api.getState())).toContain('world-puzzle-about');
    expect(api.getCurrentNode()).toBe('world-node-home');
    expect(typeof api.returnHome).toBe('function');
  });

  it('reports portal activation through the callback, not by navigating itself', async () => {
    const seen: Array<{ key: string; portal?: Element }> = [];
    const view = render(<HomeWorldView onPortalActivate={(key, portal) => seen.push({ key, portal })} />);
    const root = view.getByTestId('home-world-view');
    await waitFor(() => expect(root.querySelectorAll('.portal')).toHaveLength(7));
    /* the module owns walking; the shell only reacts to the event it forwards */
    act(() => {
      root.querySelector('#world-home')!.dispatchEvent(
        new CustomEvent('personalworld:portalactivate', {
          bubbles: true,
          detail: {
            key: 'architecture',
            route: { label: 'Architecture' },
            portal: root.querySelector('#world-portal-architecture'),
          },
        })
      );
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].key).toBe('architecture');
    expect(seen[0].portal).toBe(root.querySelector('#world-portal-architecture'));
  });

  it('ships the frozen SVG payload unchanged', () => {
    expect(worldSvg).toContain('viewBox="0 0 1600 1000"');
    expect(worldSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(worldSvg).toContain('data-portal="about"');
    expect(worldSvg).not.toMatch(/<image\b/);
  });
});
