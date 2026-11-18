import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import type { ReactNode } from 'react';

vi.mock('../features/scene-transition/SceneTransitionProvider', async () => {
  const React = await import('react');
  return {
    SceneTransitionProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useSceneTransition: () => ({
      isTransitioning: false,
      transitionTo: async ({ onCover }: { onCover: () => void }) => {
        onCover();
        return true;
      },
    }),
  };
});

// The Home World mounts a real runtime with GSAP; stub it out for route tests.
vi.mock('../world-home/HomeWorldView', () => ({
  HomeWorldView: ({ onPortalActivate }: { onPortalActivate: (key: string) => void }) => (
    <div data-testid="home-world-view">
      <button type="button" onClick={() => onPortalActivate('architecture')}>
        simulate architecture portal
      </button>
      <button type="button" onClick={() => onPortalActivate('about')}>
        simulate about portal
      </button>
    </div>
  ),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe('routing', () => {
  it('renders the world on / with a real page heading', () => {
    renderAt('/');
    expect(screen.getByTestId('home-world-view')).toBeTruthy();
    /* home owns an h1 for assistive tech and SEO; the world itself is role="img" */
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Personal World');
  });

  it.each([
    ['/about', 'A personal world,'],
    ['/architecture', 'Architecture'],
    ['/travel', 'Travel'],
    ['/research', 'Research'],
  ])('renders %s with its own heading', (path, heading) => {
    renderAt(path);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain(heading);
  });

  it('gives every page a main landmark', () => {
    for (const path of ['/about', '/architecture', '/travel', '/research']) {
      const { unmount } = renderAt(path);
      expect(document.querySelectorAll('main')).toHaveLength(1);
      unmount();
    }
  });

  it('renders the 404 page for unknown routes', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('does not exist');
  });

  it('marks the active nav item', () => {
    renderAt('/research');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('Research');
  });

  it('exposes a skip link that bypasses the world', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /skip the world/i }).getAttribute('href')).toBe('#page-start');
  });

  it('navigates from a world portal activation', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /simulate architecture portal/i }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Architecture');
  });
});

describe('content contract', () => {
  it('shows CONTENT_PENDING wherever the owner has not supplied copy', () => {
    renderAt('/about');
    expect(screen.getAllByText('CONTENT_PENDING').length).toBeGreaterThan(0);
  });

  it('never fabricates an Instagram account', () => {
    renderAt('/about');
    expect(screen.queryByText(/instagram\.com/i)).toBeNull();
    expect(screen.getByText(/instagram account/i)).toBeTruthy();
  });

  it('links the one verified social account', () => {
    renderAt('/about');
    const link = screen.getByRole('link', { name: 'jhon-wickyyy' });
    expect(link.getAttribute('href')).toBe('https://github.com/jhon-wickyyy');
  });

  it('reports how many projects each world has supplied', () => {
    /* Architecture: 2 ingested projects. Research: 1 (the KG platform).
       Travel still waits for content. */
    for (const [path, count] of [['/architecture', '2 supplied'], ['/research', '1 supplied'], ['/travel', '0 supplied']] as const) {
      const { unmount } = renderAt(path);
      expect(screen.getByText(count)).toBeTruthy();
      unmount();
    }
  });
});
