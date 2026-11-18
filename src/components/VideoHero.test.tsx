import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoHero } from './VideoHero';
import type { MediaItem } from './ui';

const FILM: MediaItem = { kind: 'video', src: '/media/travel.mp4', poster: '/media/travel.jpg', caption: 'Aershan, winter' };

describe('VideoHero', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders a restrained spec plate when no film is supplied', () => {
    render(<VideoHero item={null} label="Travel featured film" />);
    expect(screen.getByTestId('video-hero-pending')).toBeTruthy();
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByText(/no film supplied yet/i)).toBeTruthy();
    expect(screen.getByText(/CONTENT_PENDING/)).toBeTruthy();
  });

  it('renders a muted, looping, inline video when a film exists', () => {
    render(<VideoHero item={FILM} label="Travel featured film" />);
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute('src')).toBe('/media/travel.mp4');
    expect(video.getAttribute('poster')).toBe('/media/travel.jpg');
    /* React sets `muted` as a property, not an attribute */
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('loop')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.preload).toBe('metadata');
  });

  it('falls back to a play button when autoplay is blocked', async () => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError')),
    });

    render(<VideoHero item={FILM} label="Travel featured film" />);
    const button = await screen.findByRole('button', { name: /play travel featured film/i });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toMatch(/autoplay was blocked/i);
  });

  it('never unmutes on its own and exposes a mute toggle', async () => {
    render(<VideoHero item={FILM} label="Travel featured film" />);
    const video = document.querySelector('video') as HTMLVideoElement;
    await waitFor(() => expect(video.muted).toBe(true));

    const mute = screen.getByRole('button', { name: /unmute travel featured film/i });
    expect(mute.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(mute);
    expect(video.muted).toBe(false);
    expect(screen.getByRole('button', { name: /mute travel featured film/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not autoplay audio: muted before play() is called', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    render(<VideoHero item={FILM} label="Travel featured film" />);
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(play).toHaveBeenCalled();
  });
});
