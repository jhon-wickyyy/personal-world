/**
 * gsap-motion.js — GSAP animation layer for the frozen Home World.
 *
 * Non-invasive by design. It never moves, resizes or rewrites geometry, and it
 * never touches the transforms the runtime owns:
 *
 *   runtime owns   #world-character   (translate along the route)
 *                  #world-home        (viewBox / camera)
 *                  .bridge-ground     (opacity + data-state, via CSS)
 *
 *   GSAP owns      #world-character-facing  (bob / lean / squash)
 *                  .character-shadow        (squash)
 *                  .portal-* children       (bloom / dip)
 *                  .mechanism-* children    (press / nudge)
 *                  .path-ribbon dash offset (light sweep)
 *
 * It listens to the runtime's public custom events, so the runtime stays
 * animation-agnostic and the 32-assertion browser suite keeps passing.
 *
 *   import { attachGsapMotion } from '../src/world/gsap-motion.js';
 *   const motion = attachGsapMotion(document.getElementById('world-home'));
 *   motion.destroy();
 */

import { gsap } from 'gsap';

const WALK_BOB = 0.26;      // seconds per bob cycle
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function attachGsapMotion(svg, options = {}) {
  if (!svg) throw new Error('attachGsapMotion: svg element required');
  const reduced = options.reducedMotion === undefined ? REDUCED() : !!options.reducedMotion;
  const character = svg.querySelector('#world-character');
  const facing = svg.querySelector('#world-character-facing');
  const shadow = svg.querySelector('.character-shadow');

  const tweens = [];
  const track = (t) => { if (t) tweens.push(t); return t; };

  /* ------------------------------------------------------------ walk detail */
  let bob = null;
  let lean = null;
  let squash = null;

  function startWalk() {
    if (reduced || !facing) return;
    stopWalk();
    bob = track(gsap.to(facing, {
      y: -2.2, duration: WALK_BOB, ease: 'sine.inOut', yoyo: true, repeat: -1,
    }));
    lean = track(gsap.to(facing, {
      rotation: 2.4, duration: WALK_BOB * 2, ease: 'sine.inOut', yoyo: true, repeat: -1,
      transformOrigin: '50% 100%',
    }));
    if (shadow) {
      squash = track(gsap.to(shadow, {
        scaleX: 0.86, scaleY: 0.9, duration: WALK_BOB, ease: 'sine.inOut', yoyo: true, repeat: -1,
        transformOrigin: '50% 50%',
      }));
    }
  }

  function stopWalk() {
    for (const t of [bob, lean, squash]) if (t) t.kill();
    bob = lean = squash = null;
    if (facing) gsap.to(facing, { y: 0, rotation: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
    if (shadow) gsap.to(shadow, { scaleX: 1, scaleY: 1, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
  }

  const observer = character
    ? new MutationObserver(() => {
        const walking = character.classList.contains('walking');
        if (walking) startWalk();
        else stopWalk();
      })
    : null;
  observer?.observe(character, { attributes: true, attributeFilter: ['class'] });

  /* --------------------------------------------------- bridge open timeline */
  function bridgeOpen(puzzleId) {
    const bridge = svg.querySelector(`.bridge-ground[data-gate="${puzzleId}"]`);
    const ribbons = [...svg.querySelectorAll(`.path-ribbon[data-requires="${puzzleId}"]`)];
    const mechanism = svg.querySelector(`.mechanism[data-mechanism="${puzzleId}"]`);
    if (reduced) {
      if (bridge) gsap.set(bridge, { clearProps: 'transform' });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    /* 1. mechanism depresses */
    if (mechanism) {
      const core = mechanism.querySelector('.mechanism-core');
      if (core) tl.fromTo(core, { y: 0, scale: 1 }, { y: 2.5, scale: 0.86, duration: 0.12, yoyo: true, repeat: 1 }, 0);
    }
    /* 2. the ground plank unfolds across the gap */
    if (bridge) {
      tl.fromTo(bridge,
        { y: 3, scaleY: 0.72, opacity: 0, transformOrigin: '0% 50%' },
        { y: 0, scaleY: 1, opacity: 1, duration: 0.5 }, 0.1);
      const lip = bridge.previousElementSibling;
      if (lip && lip.classList.contains('bridge-lip')) {
        tl.fromTo(lip, { y: 3, scaleY: 0.72, opacity: 0, transformOrigin: '0% 50%' },
          { y: 0, scaleY: 1, opacity: 1, duration: 0.5 }, 0.1);
      }
    }
    /* 3. the path lights along its length */
    ribbons.forEach((ribbon, i) => {
      let len = 0;
      try { len = ribbon.getTotalLength ? ribbon.getTotalLength() : 0; } catch { len = 0; }
      if (len) {
        tl.fromTo(ribbon,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 0.42 }, 0.3 + i * 0.06);
      } else {
        tl.fromTo(ribbon, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3 + i * 0.06);
      }
    });
    /* 4. portal wakes up */
    tl.add(() => pulsePortals(puzzleId), 0.72);
    track(tl);
  }

  function bridgeClose(puzzleId) {
    const bridge = svg.querySelector(`.bridge-ground[data-gate="${puzzleId}"]`);
    const ribbons = [...svg.querySelectorAll(`.path-ribbon[data-requires="${puzzleId}"]`)];
    if (reduced || !bridge) return;
    track(gsap.timeline()
      .to(ribbons, { opacity: 0, duration: 0.2 }, 0)
      .to(bridge, { y: 3, scaleY: 0.72, opacity: 0, duration: 0.32, ease: 'power2.in' }, 0));
  }

  function pulsePortals(puzzleId) {
    const route = svg.querySelector(`.portal[data-portal]`);
    for (const portal of svg.querySelectorAll('.portal:not(.is-locked)')) {
      const inner = portal.querySelector('.portal-inner');
      if (!inner) continue;
      track(gsap.fromTo(inner, { opacity: 0.4, scale: 0.94, transformOrigin: '50% 100%' },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }));
    }
    void route; void puzzleId;
  }

  /* ------------------------------------------------------- blocked feedback */
  function blockedNudge(detail) {
    if (reduced) return;
    const ids = detail?.missingPuzzles || [];
    for (const id of ids) {
      const mechanism = svg.querySelector(`.mechanism[data-mechanism="${id}"]`);
      if (!mechanism) continue;
      track(gsap.fromTo(mechanism, { x: 0 }, {
        x: 3, duration: 0.07, repeat: 3, yoyo: true, ease: 'sine.inOut', onComplete: () => gsap.set(mechanism, { x: 0 }),
      }));
    }
    const portal = svg.querySelector(`.portal[data-portal="${detail?.key}"]`);
    if (portal) {
      track(gsap.fromTo(portal, { opacity: 1 }, { opacity: 0.55, duration: 0.12, repeat: 3, yoyo: true }));
    }
  }

  /* --------------------------------------------------- portal entry bloom */
  function portalBloom(detail) {
    if (reduced) return;
    const portal = svg.querySelector(`.portal[data-portal="${detail?.key}"]`);
    if (portal) {
      track(gsap.timeline()
        .to(portal, { scale: 1.08, duration: 0.3, transformOrigin: '50% 100%', ease: 'power2.out' })
        .to(portal, { scale: 1, duration: 0.45, ease: 'power2.inOut' }));
      const core = portal.querySelector('.portal-core');
      if (core) {
        track(gsap.fromTo(core, { scale: 1, opacity: 1 }, { scale: 1.9, opacity: 0, duration: 0.55, ease: 'power2.out' }));
      }
    }
    if (facing) track(gsap.to(facing, { scale: 0.92, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }));
  }

  const onPuzzle = (e) => (e.detail?.solved ? bridgeOpen(e.detail.puzzleId) : bridgeClose(e.detail.puzzleId));
  const onBlocked = (e) => blockedNudge(e.detail);
  const onActivate = (e) => portalBloom(e.detail);

  svg.addEventListener('personalworld:puzzlestatechange', onPuzzle);
  svg.addEventListener('personalworld:pathblocked', onBlocked);
  svg.addEventListener('personalworld:portalactivate', onActivate);

  function destroy() {
    svg.removeEventListener('personalworld:puzzlestatechange', onPuzzle);
    svg.removeEventListener('personalworld:pathblocked', onBlocked);
    svg.removeEventListener('personalworld:portalactivate', onActivate);
    observer?.disconnect();
    for (const t of tweens) t.kill();
    tweens.length = 0;
    stopWalk();
  }

  return {
    destroy,
    get reducedMotion() { return reduced; },
    /* exposed for tests / storybook-style pokes */
    playBridge: (id) => bridgeOpen(id),
    playBlocked: (detail) => blockedNudge(detail),
    playBloom: (detail) => portalBloom(detail),
    isAnimating: () => tweens.some((t) => t.isActive?.()),
  };
}
