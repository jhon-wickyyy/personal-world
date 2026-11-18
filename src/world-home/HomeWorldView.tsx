/**
 * HomeWorldView  -  the seam between the site and the frozen Home World module.
 *
 * The module in ../../world is copied verbatim from personal-world-home-v0.2.3
 * and verified by its own CI (170 geometry assertions + 10 runtime tests). This
 * file only:
 *   - feeds it the SVG *markup* (inline, never <img>: the runtime needs the ids)
 *   - forwards portal activation to React Router / external links
 *   - ties the runtime's lifetime to the route, so the GSAP layer cannot leak
 */

import { useCallback, useRef } from 'react';
import worldSvg from '../../world/HOME_WORLD.svg?raw';
import { HomeWorld as HomeWorldModule } from '../../world/src/react/HomeWorld.jsx';
import type {
  HomeWorldComponent,
  HomeWorldHandle,
  HomeWorldProps,
  PathBlockedDetail,
  PortalActivateDetail,
} from './types';

import '../../world/build/home-world.css';
import '../../world/src/styles/world-runtime.css';
import './home-world-view.css';

/* The module is JS: cast once, here, to the site's typed surface. */
const World = HomeWorldModule as unknown as HomeWorldComponent;

export interface HomeWorldViewProps {
  /** called when the character reaches an unlocked portal */
  onPortalActivate: (key: string, portal?: Element) => void;
  /** called when a locked portal is tapped */
  onPathBlocked?: (detail: PathBlockedDetail) => void;
  /** exposes the imperative runtime handle (tests, "return to centre") */
  onReady?: (handle: HomeWorldHandle) => void;
}

export function HomeWorldView({ onPortalActivate, onPathBlocked, onReady }: HomeWorldViewProps) {
  const handle = useRef<HomeWorldHandle | null>(null);

  const handlePortal = useCallback(
    (detail: PortalActivateDetail) => onPortalActivate(detail.key, detail.portal),
    [onPortalActivate]
  );

  const props: HomeWorldProps = {
    svgMarkup: worldSvg,
    forwardRef: handle,
    runtimeOptions: {},
    onPortalActivate: handlePortal,
    onPathBlocked,
    onReady: ({ runtime }) => {
      handle.current = runtime as HomeWorldHandle;
      onReady?.(handle.current);
    },
  };

  return (
    <div className="home-world" data-testid="home-world-view">
      <World {...props} />
    </div>
  );
}
