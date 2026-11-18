import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArchitecturePage } from './ArchitecturePage';
import { ready } from '../content/types';
import type { ProjectEntry } from '../content/types';

const renderPage = (projects?: ProjectEntry[]) =>
  render(
    <MemoryRouter>
      <ArchitecturePage projects={projects} />
    </MemoryRouter>
  );

const fixture = (id: string, title: string): ProjectEntry => ({
  id,
  title: ready(title),
  year: ready('2024'),
  summary: ready(`${title} summary`),
  cover: ready(`/architecture/${id}.jpg`),
  gallery: ready([]),
  media: { renders: [{ kind: 'image', src: `/architecture/${id}-r1.jpg` }] },
});

describe('ArchitecturePage', () => {
  it('shows a large plate and an independent index, no blank box', () => {
    renderPage([]);
    const index = screen.getByRole('complementary', { name: /project index/i });
    expect(within(index).getAllByRole('button')).toHaveLength(3);
    expect(within(index).getByText('0 supplied')).toBeTruthy();
    /* the empty plate states its role instead of rendering an empty rectangle */
    expect(screen.getAllByText(/hero render/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no project supplied yet/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /open .* project page/i })).toBeNull();
  });

  it('switches the selected plate from the index', () => {
    renderPage([]);
    const index = screen.getByRole('complementary', { name: /project index/i });
    const buttons = within(index).getAllByRole('button');

    fireEvent.click(buttons[1]);
    expect(buttons[1].getAttribute('aria-current')).toBe('true');
    expect(buttons[0].getAttribute('aria-current')).toBeNull();
    expect(screen.getAllByText(/model study/i).length).toBeGreaterThan(0);
  });

  it('defaults to the owner supplied architecture projects', () => {
    renderPage(undefined);
    const index = screen.getByRole('complementary', { name: /project index/i });
    /* two real projects were ingested; the index must not fall back to slots */
    expect(within(index).queryByText(/slot 01/i)).toBeNull();
    expect(within(index).getAllByRole('button')).toHaveLength(2);
    expect(within(index).getByText('2 supplied')).toBeTruthy();
  });

  it('links the plate to the shareable project page', () => {
    renderPage([fixture('alumni-hall', 'Alumni Hall'), fixture('tower', 'Tower')]);
    const index = screen.getByRole('complementary', { name: /project index/i });
    expect(within(index).getByText('Alumni Hall')).toBeTruthy();

    const plate = screen.getByRole('button', { name: /open alumni hall project page/i });
    expect(plate).toBeTruthy();

    fireEvent.click(within(index).getAllByRole('button')[1]);
    expect(screen.getByRole('button', { name: /open tower project page/i })).toBeTruthy();
  });
});
