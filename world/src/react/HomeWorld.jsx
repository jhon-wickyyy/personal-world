/**
 * HomeWorld.jsx — React wrapper for the frozen Home World.
 *
 * The SVG must be inline in the DOM (the runtime reads ids and data-* attributes
 * directly), so the component takes the SVG *markup* and imports it into a host
 * element it owns. The runtime and the GSAP motion layer are mounted on that
 * element and torn down on unmount.
 *
 *   import { HomeWorld } from './HomeWorld.jsx';
 *   <HomeWorld svgMarkup={svgText} onPortalActivate={({ key }) => openPanel(key)} />
 *
 * Everything that is content (About text, project galleries, the real GitHub and
 * Instagram URLs) is deliberately NOT invented here — it is passed in by the site.
 */

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { mountWorldRuntime } from '../world/world-runtime.js';
import { attachGsapMotion } from '../world/gsap-motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function HomeWorld({
  svgMarkup,
  className = '',
  hostClassName = 'world-host',
  runtimeOptions,
  enableGsap = true,
  onReady,
  onPortalActivate,
  onPathBlocked,
  onPuzzleStateChange,
  forwardRef,
}) {
  const hostRef = useRef(null);
  const svgRef = useRef(null);
  const runtimeRef = useRef(null);
  const motionRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(forwardRef, () => ({
    getState: () => runtimeRef.current?.getState(),
    getCurrentNode: () => runtimeRef.current?.getCurrentNode(),
    isWalking: () => runtimeRef.current?.isWalking() ?? false,
    enterPortal: (key) => runtimeRef.current?.enterPortal(key),
    returnHome: () => runtimeRef.current?.returnHome(),
    togglePuzzle: (id) => runtimeRef.current?.togglePuzzle(id),
    reset: () => runtimeRef.current?.reset(),
    setCamera: (key) => runtimeRef.current?.setCamera(key),
    announce: (msg) => runtimeRef.current?.announce(msg),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !svgMarkup) return undefined;

    let disposed = false;
    let mountedSvg = null;

    try {
      const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) {
        throw new Error('HOME_WORLD.svg is not valid XML');
      }
      const root = parsed.documentElement;
      if (root.namespaceURI !== SVG_NS) {
        throw new Error(
          `HOME_WORLD.svg root is not in the SVG namespace ("${root.namespaceURI}"). ` +
          'The file is missing xmlns="http://www.w3.org/2000/svg".'
        );
      }
      mountedSvg = document.importNode(root, true);
      host.prepend(mountedSvg);
      svgRef.current = mountedSvg;

      const runtime = mountWorldRuntime(mountedSvg, { host, ...(runtimeOptions || {}) });
      runtimeRef.current = runtime;

      if (enableGsap) {
        motionRef.current = attachGsapMotion(mountedSvg, {
          reducedMotion: runtimeOptions?.reducedMotion,
        });
      }

      if (!disposed) {
        setReady(true);
        onReady?.({ runtime, motion: motionRef.current, svg: mountedSvg });
      }
    } catch (err) {
      if (!disposed) setError(err.message);
    }

    return () => {
      disposed = true;
      try { motionRef.current?.destroy(); } catch { /* already gone */ }
      try { runtimeRef.current?.destroy(); } catch { /* already gone */ }
      motionRef.current = null;
      runtimeRef.current = null;
      svgRef.current = null;
      if (mountedSvg && mountedSvg.parentNode) mountedSvg.parentNode.removeChild(mountedSvg);
      setReady(false);
    };
    /* svgMarkup identity is the only mount trigger; options are read once */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgMarkup, enableGsap]);

  /* forward the runtime's custom events as React callbacks */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !ready) return undefined;
    const onPuzzle = (e) => onPuzzleStateChange?.(e.detail);
    const onBlocked = (e) => onPathBlocked?.(e.detail);
    const onActivate = (e) => onPortalActivate?.(e.detail);
    svg.addEventListener('personalworld:puzzlestatechange', onPuzzle);
    svg.addEventListener('personalworld:pathblocked', onBlocked);
    svg.addEventListener('personalworld:portalactivate', onActivate);
    return () => {
      svg.removeEventListener('personalworld:puzzlestatechange', onPuzzle);
      svg.removeEventListener('personalworld:pathblocked', onBlocked);
      svg.removeEventListener('personalworld:portalactivate', onActivate);
    };
  }, [ready, onPuzzleStateChange, onPathBlocked, onPortalActivate]);

  const retry = useCallback(() => {
    setError(null);
  }, []);

  return (
    <main
      ref={hostRef}
      id="world-host"
      className={[hostClassName, className].filter(Boolean).join(' ')}
      data-world-ready={ready ? 'true' : 'false'}
      aria-label="Personal World"
    >
      {error ? (
        <div className="runtime-error" role="alert" onClick={retry}>
          {error}
        </div>
      ) : null}
    </main>
  );
}

export default HomeWorld;
