import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const INTRO_STORAGE_KEY = 'personal-world:intro-seen:v1';

function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    // Storage can be disabled; the intro still completes for this mount.
  }
}

export interface HomeWorldIntroState {
  isPlaying: boolean;
  skipIntro: () => void;
}

/**
 * First-visit reveal for the Home World. It animates layer opacity, the SVG
 * root's CSS scale, and the site chrome's small entrance offset. Runtime still
 * owns viewBox/camera and character translation; gsap-motion owns character facing.
 */
export function useHomeWorldIntro(ready: boolean): HomeWorldIntroState {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const targetsRef = useRef<Element[]>([]);
  const transformTargetsRef = useRef<Element[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const finish = useCallback((remember = true) => {
    timelineRef.current?.kill();
    timelineRef.current = null;
    const targets = targetsRef.current;
    if (targets.length) gsap.set(targets, { clearProps: 'opacity,visibility' });
    const transformTargets = transformTargetsRef.current;
    if (transformTargets.length) gsap.set(transformTargets, { clearProps: 'transform,filter' });
    targetsRef.current = [];
    transformTargetsRef.current = [];
    if (remember) markIntroSeen();
    setIsPlaying(false);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return undefined;

    const root = document.querySelector<HTMLElement>('.home-world');
    const svg = root?.querySelector<SVGSVGElement>('#world-home');
    if (!root || !svg) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced || hasSeenIntro()) return undefined;

    const background = svg.querySelector('#background');
    const far = svg.querySelector('#farWorld');
    const central = svg.querySelector('#centralWorld');
    const foreground = svg.querySelector('#foreground');
    const character = svg.querySelector('#world-character');
    const portals = [...svg.querySelectorAll('.portal')];
    const chrome = root.parentElement?.querySelector('.home-chrome__intro') ?? document.querySelector('.home-chrome__intro');
    const reset = root.parentElement?.querySelector('.home-chrome__reset') ?? document.querySelector('.home-chrome__reset');

    const layers = [background, far, central, foreground, character, ...portals, chrome, reset].filter(
      (node): node is Element => Boolean(node)
    );
    targetsRef.current = [svg, ...layers];
    transformTargetsRef.current = [svg, chrome, reset].filter((node): node is Element => Boolean(node));

    gsap.set(svg, { scale: 0.975, transformOrigin: '50% 50%', filter: 'blur(3px)' });
    const fadeTargets = [far, central, foreground, character, ...portals, chrome, reset].filter(
      (node): node is Element => Boolean(node)
    );
    gsap.set(fadeTargets, { autoAlpha: 0 });
    if (background) gsap.set(background, { autoAlpha: 0 });
    setIsPlaying(true);

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.out', overwrite: 'auto' },
      onComplete: () => finish(true),
    });
    timelineRef.current = timeline;

    timeline.to(svg, { scale: 1, filter: 'blur(0px)', duration: 1.08, ease: 'power3.out' }, 0);
    if (background) timeline.to(background, { autoAlpha: 1, duration: 0.42 }, 0);
    if (far) timeline.to(far, { autoAlpha: 1, duration: 0.62 }, 0.08);
    if (central) timeline.to(central, { autoAlpha: 1, duration: 0.62 }, 0.22);
    if (foreground) timeline.to(foreground, { autoAlpha: 1, duration: 0.48 }, 0.48);
    if (character) timeline.to(character, { autoAlpha: 1, duration: 0.34 }, 0.72);
    if (portals.length) timeline.to(portals, { autoAlpha: 1, duration: 0.34, stagger: 0.045 }, 0.78);
    if (chrome) timeline.to(chrome, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.84);
    if (reset) timeline.to(reset, { autoAlpha: 1, y: 0, duration: 0.34 }, 1.02);
    timeline.to({}, { duration: 0.12 }, 1.38);

    return () => {
      timeline.kill();
      timelineRef.current = null;
      const currentTargets = targetsRef.current;
      if (currentTargets.length) gsap.set(currentTargets, { clearProps: 'opacity,visibility' });
      const transformTargets = transformTargetsRef.current;
      if (transformTargets.length) gsap.set(transformTargets, { clearProps: 'transform,filter' });
      targetsRef.current = [];
      transformTargetsRef.current = [];
    };
  }, [finish, ready]);

  const skipIntro = useCallback(() => finish(true), [finish]);

  return { isPlaying, skipIntro };
}
