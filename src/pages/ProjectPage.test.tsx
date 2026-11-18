import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectPage } from './ProjectPage';
import { architectureEntries } from '../content/projects';

const first = architectureEntries[0];

const renderAt = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/architecture/${id}`]}>
      <Routes>
        <Route path="/architecture/:projectId" element={<ProjectPage />} />
        <Route path="/architecture" element={<div>architecture index</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProjectPage', () => {
  it('renders the real project with its media groups', () => {
    renderAt(first.id);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(first.title.value);
    expect(screen.getByRole('heading', { name: /renders/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /analysis/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /drawings/i })).toBeTruthy();
    /* the hero is a real image supplied by the owner */
    expect(screen.getByRole('button', { name: /open the hero image full size/i })).toBeTruthy();
  });

  it('opens the image full size and closes with Escape', () => {
    renderAt(first.id);
    const thumbs = screen.getAllByRole('button', { name: /open .* image \d+ full size/i });
    expect(thumbs.length).toBeGreaterThan(0);

    fireEvent.click(thumbs[0]);
    const lightbox = screen.getByTestId('lightbox');
    expect(lightbox).toBeTruthy();
    expect(within(lightbox).getByRole('img')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('lightbox')).toBeNull();
  });

  it('steps through the group with the arrow keys', () => {
    renderAt(first.id);
    fireEvent.click(screen.getAllByRole('button', { name: /open .* image 1 full size/i })[0]);
    const before = screen.getByText(/01 \//).textContent;
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText(/02 \//).textContent).not.toBe(before);
  });

  it('lists the supplied documents', () => {
    renderAt(first.id);
    const links = screen.getAllByRole('link', { name: /pdf/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toMatch(/\.pdf$/);
  });

  it('redirects to the architecture index for an unknown project', () => {
    renderAt('does-not-exist');
    expect(screen.getByText('architecture index')).toBeTruthy();
  });
});
