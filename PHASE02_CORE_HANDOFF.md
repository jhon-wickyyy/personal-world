# Phase 02 Core Animation Handoff

This patch adds the Home World first-visit intro and the portal-to-page scene transition. The frozen `world/` directory is unchanged.

## Implemented

- `src/features/home-world/intro/useHomeWorldIntro.ts`: 1.5s first-visit reveal, localStorage guard, skip control, and reduced-motion bypass.
- `src/features/scene-transition/SceneTransitionProvider.tsx`: app-shell transition layer; portal-origin iris close, geometric fold, route swap while covered, then iris reveal from the portal origin.
- `src/features/scene-transition/transition-geometry.ts`: portal origin and cover-radius calculations.
- `HomeWorldView` now forwards the reached SVG portal element as the optional second callback argument.
- `HomePage` routes About and the four work portals through the transition provider. GitHub and the pending Instagram modal retain their existing behavior.
- `SiteLayout` hosts the provider so it survives the HomePage unmount during route changes.

## Ownership boundaries

- Intro animates SVG/group opacity and the SVG root CSS scale. It does not animate the runtime-owned viewBox or character translation, nor the GSAP motion-owned facing group.
- Scene transition animates the outer `.home-world` wrapper and its own overlay. It does not modify SVG geometry, route topology, or the runtime camera.
- The overlay uses a radial mask hole: it closes toward the portal before navigation and opens outward from the portal after navigation.

## Required verification on the project machine

1. `npm install` (or the package manager already used by the project).
2. `npm run verify`.
3. In Chromium, clear `localStorage['personal-world:intro-seen:v1']`, reload `/`, confirm the 1.5s intro and Skip intro control.
4. Solve the About mechanism, enter its portal, confirm the overlay closes around that portal, the route changes while covered, and the About page reveals outward from the same origin.
5. Repeat once at 390x844 for a far portal.
6. Emulate `prefers-reduced-motion: reduce`; intro should be skipped and portal navigation should be immediate.

The frozen-world checks can be run independently with:

```bash
node world/tools/validate-home-world.mjs
node --test world/tests/world-runtime.test.mjs
```
