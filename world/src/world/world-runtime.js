/**
 * world-runtime.js — production interaction runtime for Home World v0.2.
 *
 * Geometry remains frozen in HOME_WORLD.svg. This module reads all walk-node,
 * portal, mechanism and bridge positions from SVG attributes; it never owns a
 * second coordinate table.
 */
import {
  homeWorldRoutes,
  routeNodeIds,
  routeSegments,
  routeIsOpen,
  walkablePrefix,
} from '../content/home-world-routes.js';

export const WORLD_STORAGE_KEY = 'personal-world:home:v2';
export const WORLD_CANVAS = Object.freeze({ width: 1600, height: 1000 });
export const DEFAULT_MOBILE_CAMERA_HEIGHT = 760;
export const MIN_HIT_TARGET_CSS_PX = 44;

export function hitTargetWorldSize(scale, minCssPixels = MIN_HIT_TARGET_CSS_PX) {
  return minCssPixels / Math.max(0.001, Number(scale) || 0.001);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const round2 = (n) => Math.round(n * 100) / 100;

function parsePair(value) {
  if (!value) return null;
  const pair = value.split(',').map(Number);
  return pair.length === 2 && pair.every(Number.isFinite) ? pair : null;
}

function parseViewBox(value) {
  const nums = String(value || '0 0 1600 1000').trim().split(/[\s,]+/).map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) {
    return { x: 0, y: 0, width: 1600, height: 1000 };
  }
  return { x: nums[0], y: nums[1], width: nums[2], height: nums[3] };
}

/** Return a camera viewBox that matches the viewport aspect ratio exactly. */
export function mobileViewBox(viewportWidth, viewportHeight, center, heightUnits = DEFAULT_MOBILE_CAMERA_HEIGHT) {
  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);
  const aspect = safeW / safeH;
  let height = Math.min(heightUnits, WORLD_CANVAS.height);
  let width = height * aspect;
  if (width > WORLD_CANVAS.width) {
    width = WORLD_CANVAS.width;
    height = width / aspect;
  }
  const cx = Number.isFinite(center?.x) ? center.x : WORLD_CANVAS.width / 2;
  const cy = Number.isFinite(center?.y) ? center.y : WORLD_CANVAS.height / 2;
  const x = clamp(cx - width / 2, 0, Math.max(0, WORLD_CANVAS.width - width));
  const y = clamp(cy - height / 2, 0, Math.max(0, WORLD_CANVAS.height - height));
  return { x: round2(x), y: round2(y), width: round2(width), height: round2(height) };
}

/** Clamp a requested viewBox to the frozen 1600 × 1000 world bounds. */
export function clampViewBox(viewBox) {
  const width = Math.min(WORLD_CANVAS.width, Math.max(1, viewBox.width));
  const height = Math.min(WORLD_CANVAS.height, Math.max(1, viewBox.height));
  return {
    x: round2(clamp(viewBox.x, 0, WORLD_CANVAS.width - width)),
    y: round2(clamp(viewBox.y, 0, WORLD_CANVAS.height - height)),
    width: round2(width),
    height: round2(height),
  };
}

/** Normalise v2 storage and the earlier flat boolean map into known puzzle ids. */
export function normalizePuzzleState(raw, puzzleIds) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  const source = parsed && parsed.version === 2 && parsed.puzzles
    ? parsed.puzzles
    : parsed;
  return Object.fromEntries(puzzleIds.map((id) => [id, Boolean(source && source[id])]));
}

export function serializePuzzleState(state) {
  return JSON.stringify({ version: 2, puzzles: { ...state }, updatedAt: Date.now() });
}

export function routeState(routeKey, state) {
  const isSolved = (id) => Boolean(state[id]);
  return {
    open: routeIsOpen(routeKey, isSolved),
    walkableNodeIds: walkablePrefix(routeKey, isSolved),
    allNodeIds: routeNodeIds(routeKey),
    missingPuzzles: [...new Set(routeSegments(routeKey)
      .filter((segment) => segment.requires && !isSolved(segment.requires))
      .map((segment) => segment.requires))],
  };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function formatViewBox(v) {
  return `${round2(v.x)} ${round2(v.y)} ${round2(v.width)} ${round2(v.height)}`;
}

function makeCustomEvent(win, name, detail) {
  return new win.CustomEvent(name, { bubbles: true, composed: true, detail });
}

/**
 * Mount the Home World runtime on an inline SVG.
 *
 * Options:
 *   host                HTML wrapper for status and mobile navigation
 *   storage             Storage-compatible object; pass null to disable saving
 *   storageKey          Override the default versioned key
 *   mobileBreakpoint    Width at which the mobile camera is enabled (default 760)
 *   mobileCameraHeight  Visible world units on mobile (default 760)
 *   reducedMotion       Force reduced motion on/off; otherwise follows OS setting
 *   onPortalActivate    async ({ key, route, portal, runtime }) => void
 *   mobileNav           Add the compact mobile camera dock (default true)
 *   parallax            Enable subtle far/foreground parallax on desktop (default true)
 */
export function mountWorldRuntime(svgOrSelector, options = {}) {
  const doc = options.document || globalThis.document;
  const svg = typeof svgOrSelector === 'string'
    ? doc?.querySelector(svgOrSelector)
    : svgOrSelector;
  if (!svg || !svg.ownerDocument) throw new Error('mountWorldRuntime: an inline SVG element is required.');

  const win = options.window || svg.ownerDocument.defaultView || globalThis.window;
  const host = options.host || svg.parentElement || svg.ownerDocument.body;
  const storageKey = options.storageKey || WORLD_STORAGE_KEY;
  const status = options.statusElement || host?.querySelector?.('[data-world-status], #world-hint') || null;
  const prefersReduced = options.reducedMotion ?? Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const canAnimate = !prefersReduced;

  const query = (selector) => svg.querySelector(selector);
  const queryAll = (selector) => [...svg.querySelectorAll(selector)];
  const getById = (id) => query(`#${id}`);
  const mechanisms = queryAll('.mechanism[data-mechanism]');
  const puzzleIds = [...new Set(mechanisms.map((el) => el.getAttribute('data-mechanism')).filter(Boolean))];
  const portalEls = queryAll('.portal[data-portal]');
  const puzzleState = Object.fromEntries(puzzleIds.map((id) => [id, false]));

  let storage = options.storage;
  if (storage === undefined) {
    try { storage = win?.localStorage || null; } catch { storage = null; }
  }

  function loadState() {
    if (!storage) return;
    try {
      Object.assign(puzzleState, normalizePuzzleState(storage.getItem(storageKey), puzzleIds));
    } catch {
      /* Private browsing / blocked storage must never prevent exploration. */
    }
  }

  function saveState() {
    if (!storage) return false;
    try {
      storage.setItem(storageKey, serializePuzzleState(puzzleState));
      return true;
    } catch {
      return false;
    }
  }

  let statusTimer = 0;
  let generatedStatus = null;
  let statusEl = status;
  if (!statusEl && host && doc) {
    generatedStatus = doc.createElement('div');
    generatedStatus.className = 'world-runtime-status';
    generatedStatus.setAttribute('data-world-status', '');
    generatedStatus.setAttribute('role', 'status');
    generatedStatus.setAttribute('aria-live', 'polite');
    host.appendChild(generatedStatus);
    statusEl = generatedStatus;
  }

  function announce(message, { persistent = false } = {}) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.add('is-visible');
    if (statusTimer) win.clearTimeout(statusTimer);
    if (!persistent) {
      statusTimer = win.setTimeout(() => statusEl?.classList.remove('is-visible'), 2800);
    }
  }

  const character = getById('world-character');
  const facing = getById('world-character-facing');
  const homeNode = getById('world-node-home');
  const homePoint = homeNode
    ? [Number(homeNode.getAttribute('cx')), Number(homeNode.getAttribute('cy'))]
    : [800, 555];
  let characterPoint = [...homePoint];
  let currentNodeId = 'world-node-home';
  let currentRouteKey = null;
  let walking = false;
  let destroyed = false;
  let lastPortalKey = null;
  let walkFrame = 0;
  let walkResolve = null;
  let cameraFrame = 0;
  let cameraResolve = null;
  let parallaxFrame = 0;
  let cameraFocus = { x: 800, y: 555 };
  let currentViewBox = parseViewBox(svg.getAttribute('viewBox'));
  let isMobile = false;
  let drag = null;
  let suppressClickUntil = 0;
  let hovered = null;
  let mobileNav = null;
  let resizeObserver = null;

  const originalLayerTransforms = new Map();
  for (const id of ['farWorld', 'foreground']) {
    const layer = getById(id);
    if (layer) originalLayerTransforms.set(layer, layer.getAttribute('transform') || '');
  }

  function getPoint(nodeId) {
    const node = getById(nodeId);
    if (!node) return null;
    const x = Number(node.getAttribute('cx'));
    const y = Number(node.getAttribute('cy'));
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  }

  function getPortalPoint(key) {
    const route = homeWorldRoutes[key];
    const portal = route ? getById(route.portal) : null;
    return parsePair(portal?.getAttribute('data-anchor'));
  }

  function getFocusPoint(keyOrPoint) {
    if (Array.isArray(keyOrPoint)) return { x: Number(keyOrPoint[0]), y: Number(keyOrPoint[1]) };
    if (keyOrPoint === 'home') return { x: homePoint[0], y: homePoint[1] };
    const portalPoint = getPortalPoint(keyOrPoint);
    if (portalPoint) return { x: portalPoint[0], y: portalPoint[1] };
    const mechanism = mechanisms.find((el) => el.getAttribute('data-mechanism') === keyOrPoint);
    const mechanismPoint = parsePair(mechanism?.getAttribute('data-anchor'));
    if (mechanismPoint) return { x: mechanismPoint[0], y: mechanismPoint[1] };
    return { ...cameraFocus };
  }

  function viewportRect() {
    const rect = svg.getBoundingClientRect?.();
    return {
      width: Math.max(1, rect?.width || win?.innerWidth || 1),
      height: Math.max(1, rect?.height || win?.innerHeight || 1),
    };
  }

  function cameraScale() {
    const rect = viewportRect();
    return Math.max(0.001, Math.min(rect.width / currentViewBox.width, rect.height / currentViewBox.height));
  }

  function setViewBox(viewBox) {
    currentViewBox = clampViewBox(viewBox);
    svg.setAttribute('viewBox', formatViewBox(currentViewBox));
  }

  function mobileBox(center) {
    const rect = viewportRect();
    return mobileViewBox(rect.width, rect.height, center, options.mobileCameraHeight || DEFAULT_MOBILE_CAMERA_HEIGHT);
  }

  function cameraCenterDirect(center) {
    cameraFocus = { x: center.x, y: center.y };
    if (!isMobile) return;
    setViewBox(mobileBox(cameraFocus));
  }

  function cancelCameraAnimation() {
    if (cameraFrame) win.cancelAnimationFrame(cameraFrame);
    cameraFrame = 0;
    if (cameraResolve) { cameraResolve(); cameraResolve = null; }
  }

  function animateCameraTo(center, duration = 680) {
    cameraFocus = { x: center.x, y: center.y };
    if (!isMobile) return Promise.resolve();
    cancelCameraAnimation();
    const from = { ...currentViewBox };
    const to = mobileBox(cameraFocus);
    if (!canAnimate || duration <= 0) {
      setViewBox(to);
      refreshHitTargets();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      cameraResolve = resolve;
      const start = win.performance?.now?.() ?? Date.now();
      const tick = (now) => {
        if (destroyed) return resolve();
        const t = clamp((now - start) / duration, 0, 1);
        const e = easeInOut(t);
        setViewBox({
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e,
          width: from.width + (to.width - from.width) * e,
          height: from.height + (to.height - from.height) * e,
        });
        if (t < 1) cameraFrame = win.requestAnimationFrame(tick);
        else {
          cameraFrame = 0;
          cameraResolve = null;
          refreshHitTargets();
          resolve();
        }
      };
      cameraFrame = win.requestAnimationFrame(tick);
    });
  }

  function setCamera(keyOrPoint, cameraOptions = {}) {
    const center = getFocusPoint(keyOrPoint);
    if (cameraOptions.immediate) {
      cancelCameraAnimation();
      cameraCenterDirect(center);
      refreshHitTargets();
      return Promise.resolve();
    }
    return animateCameraTo(center, cameraOptions.duration ?? 680);
  }

  function detectCameraMode() {
    const rect = viewportRect();
    const ratio = rect.width / rect.height;
    const breakpoint = options.mobileBreakpoint ?? 760;
    return options.forceMobileCamera === true || (
      options.forceMobileCamera !== false && (rect.width < breakpoint || ratio < 1.12)
    );
  }

  function refreshCamera({ immediate = true } = {}) {
    if (destroyed) return;
    const nextMobile = detectCameraMode();
    const changed = nextMobile !== isMobile;
    isMobile = nextMobile;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.toggle('is-mobile-camera', isMobile);
    if (isMobile) {
      if (changed) cameraFocus = { x: homePoint[0], y: homePoint[1] };
      const next = mobileBox(cameraFocus);
      setViewBox(next);
      svg.classList.add('is-touch-camera');
    } else {
      svg.classList.remove('is-touch-camera');
      setViewBox({ x: 0, y: 0, width: WORLD_CANVAS.width, height: WORLD_CANVAS.height });
    }
    refreshHitTargets();
    updateMobileNavVisibility();
  }

  function refreshHitTargets() {
    const scale = cameraScale();
    const minWorld = hitTargetWorldSize(scale);
    const targets = [...portalEls, ...mechanisms];
    for (const group of targets) {
      const old = [...group.children].find((el) => el.hasAttribute?.('data-runtime-hit-zone'));
      if (old) old.remove();
      let box;
      try { box = group.getBBox(); } catch { box = null; }
      if (!box || !Number.isFinite(box.x) || box.width <= 0 || box.height <= 0) {
        const anchor = parsePair(group.getAttribute('data-anchor')) || [0, 0];
        box = { x: anchor[0] - 20, y: anchor[1] - 36, width: 40, height: 72 };
      }
      const width = Math.max(box.width, minWorld);
      const height = Math.max(box.height, minWorld);
      const rect = doc.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', 'world-hit-target');
      rect.setAttribute('data-runtime-hit-zone', '');
      rect.setAttribute('x', String(round2(box.x + (box.width - width) / 2)));
      rect.setAttribute('y', String(round2(box.y + (box.height - height) / 2)));
      rect.setAttribute('width', String(round2(width)));
      rect.setAttribute('height', String(round2(height)));
      rect.setAttribute('fill', 'transparent');
      rect.setAttribute('stroke', 'none');
      rect.setAttribute('pointer-events', 'all');
      rect.setAttribute('aria-hidden', 'true');
      group.appendChild(rect);
    }
  }

  function applyState() {
    for (const bridge of queryAll('.bridge-ground[data-gate]')) {
      const gate = bridge.getAttribute('data-gate');
      if (!gate) continue;
      const open = Boolean(puzzleState[gate]);
      bridge.classList.toggle('is-open', open);
      bridge.setAttribute('data-state', open ? 'open' : 'initial');
    }
    for (const ribbon of queryAll('.path-ribbon[data-requires]')) {
      const requirement = ribbon.getAttribute('data-requires');
      if (!requirement) continue;
      ribbon.classList.toggle('is-open', Boolean(puzzleState[requirement]));
    }
    for (const mechanism of mechanisms) {
      const id = mechanism.getAttribute('data-mechanism');
      const solved = Boolean(puzzleState[id]);
      mechanism.classList.toggle('is-solved', solved);
      if (solved) mechanism.classList.remove('is-suggested', 'is-pulse');
      mechanism.setAttribute('aria-pressed', String(solved));
    }
    for (const [key, route] of Object.entries(homeWorldRoutes)) {
      const portal = getById(route.portal);
      if (!portal) continue;
      const open = routeIsOpen(key, (id) => Boolean(puzzleState[id]));
      portal.classList.toggle('is-locked', !open);
      portal.setAttribute('aria-description', open ? 'Path is open.' : 'Path is incomplete. Find and activate the nearby mechanism.');
    }
  }

  function pulseMechanism(id) {
    const mechanism = mechanisms.find((el) => el.getAttribute('data-mechanism') === id);
    if (!mechanism) return;
    mechanism.classList.remove('is-pulse', 'is-suggested');
    void mechanism.getBoundingClientRect?.();
    mechanism.classList.add('is-pulse', 'is-suggested');
    win.setTimeout(() => mechanism.classList.remove('is-pulse'), 1500);
  }

  function canClosePuzzle(id) {
    if (!currentRouteKey || currentNodeId === 'world-node-home') return true;
    const ids = routeNodeIds(currentRouteKey);
    const index = ids.indexOf(currentNodeId);
    if (index <= 0) return true;
    const traversed = routeSegments(currentRouteKey).slice(0, index);
    return !traversed.some((segment) => segment.requires === id);
  }

  function togglePuzzle(id) {
    if (walking || !Object.hasOwn(puzzleState, id)) return false;
    const next = !puzzleState[id];
    if (!next && !canClosePuzzle(id)) {
      announce('Return to the central island before closing the bridge you are standing on.');
      return false;
    }
    puzzleState[id] = next;
    applyState();
    saveState();
    announce(next ? 'The space has changed. The bridge is now connected.' : 'The bridge has returned to its original position.');
    svg.dispatchEvent(makeCustomEvent(win, 'personalworld:puzzlestatechange', {
      puzzleId: id,
      solved: next,
      state: { ...puzzleState },
    }));
    return true;
  }

  function setFacingDirection(dx) {
    if (!facing) return;
    facing.setAttribute('transform', `scale(${dx < 0 ? -1 : 1},1)`);
  }

  function setCharacterPosition(point, nodeId = currentNodeId) {
    characterPoint = [point[0], point[1]];
    currentNodeId = nodeId;
    if (character) character.setAttribute('transform', `translate(${round2(point[0])} ${round2(point[1])})`);
    if (isMobile) cameraCenterDirect({ x: point[0], y: point[1] - 70 });
  }

  function animateSegment(from, to, nextNodeId) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const distance = Math.hypot(dx, dy);
    setFacingDirection(dx);
    if (destroyed) return Promise.resolve();
    if (!canAnimate || distance < 0.5) {
      setCharacterPosition(to, nextNodeId);
      return Promise.resolve();
    }
    const duration = Math.max(150, (distance / (options.walkSpeed || 220)) * 1000);
    const start = win.performance?.now?.() ?? Date.now();
    return new Promise((resolve) => {
      walkResolve = resolve;
      const tick = (now) => {
        if (destroyed) { walkResolve = null; return resolve(); }
        const t = clamp((now - start) / duration, 0, 1);
        const e = easeInOut(t);
        const point = [from[0] + dx * e, from[1] + dy * e];
        setCharacterPosition(point, t >= 1 ? nextNodeId : currentNodeId);
        if (t < 1) walkFrame = win.requestAnimationFrame(tick);
        else {
          walkFrame = 0;
          walkResolve = null;
          setCharacterPosition(to, nextNodeId);
          resolve();
        }
      };
      walkFrame = win.requestAnimationFrame(tick);
    });
  }

  async function walkNodeIds(nodeIds, routeKey) {
    if (!character || !nodeIds?.length || walking) return false;
    const points = nodeIds.map((id) => ({ id, point: getPoint(id) })).filter((x) => x.point);
    if (!points.length) return false;
    walking = true;
    currentRouteKey = routeKey || currentRouteKey;
    character.classList.add('walking');
    try {
      let from = [...characterPoint];
      for (const item of points) {
        if (destroyed) break;
        const isCurrent = Math.hypot(from[0] - item.point[0], from[1] - item.point[1]) < 0.5;
        if (!isCurrent) await animateSegment(from, item.point, item.id);
        else setCharacterPosition(item.point, item.id);
        from = item.point;
      }
      return !destroyed;
    } finally {
      character.classList.remove('walking');
      walking = false;
    }
  }

  async function returnHome() {
    if (walking) return false;
    if (currentNodeId === 'world-node-home') {
      currentRouteKey = null;
      lastPortalKey = null;
      return true;
    }
    if (!currentRouteKey) {
      setCharacterPosition(homePoint, 'world-node-home');
      currentRouteKey = null;
      return true;
    }
    const ids = routeNodeIds(currentRouteKey);
    const index = ids.indexOf(currentNodeId);
    if (index < 0) {
      setCharacterPosition(homePoint, 'world-node-home');
      currentRouteKey = null;
      return true;
    }
    const reversePath = ids.slice(0, index + 1).reverse();
    await walkNodeIds(reversePath, currentRouteKey);
    currentNodeId = 'world-node-home';
    currentRouteKey = null;
    lastPortalKey = null;
    await setCamera('home');
    return true;
  }

  async function enterPortal(key) {
    const route = homeWorldRoutes[key];
    if (!route || walking || destroyed) return false;
    if (currentNodeId !== 'world-node-home') await returnHome();
    if (isMobile) await setCamera('home');

    const progress = routeState(key, puzzleState);
    lastPortalKey = key;
    await walkNodeIds(progress.walkableNodeIds, key);

    if (!progress.open) {
      announce('The path is incomplete. Activate the highlighted mechanism to connect the missing bridge.');
      progress.missingPuzzles.forEach(pulseMechanism);
      if (isMobile && progress.missingPuzzles[0]) {
        await setCamera(progress.missingPuzzles[0]);
      }
      svg.dispatchEvent(makeCustomEvent(win, 'personalworld:pathblocked', {
        key,
        missingPuzzles: progress.missingPuzzles,
        reachedNode: currentNodeId,
      }));
      return false;
    }

    if (isMobile) await setCamera(key);
    const portal = getById(route.portal);
    portal?.classList.add('is-active');
    if (character) character.classList.add('entering');
    const detail = { key, route, portal, runtime: api };
    svg.dispatchEvent(makeCustomEvent(win, 'personalworld:portalactivate', detail));
    try {
      if (typeof options.onPortalActivate === 'function') await options.onPortalActivate(detail);
      else announce(`${route.label} portal reached.`);
    } finally {
      win.setTimeout(() => {
        character?.classList.remove('entering');
        portal?.classList.remove('is-active');
      }, prefersReduced ? 0 : 520);
    }
    return true;
  }

  function handleActivation(target) {
    if (!target) return;
    const mechanism = target.closest?.('.mechanism[data-mechanism]');
    if (mechanism && svg.contains(mechanism)) {
      togglePuzzle(mechanism.getAttribute('data-mechanism'));
      return;
    }
    const portal = target.closest?.('.portal[data-portal]');
    if (portal && svg.contains(portal)) enterPortal(portal.getAttribute('data-portal'));
  }

  function clearHover() {
    if (!hovered) return;
    hovered.classList.remove('is-hovered');
    const key = hovered.getAttribute('data-portal');
    const mechanismId = hovered.getAttribute('data-mechanism');
    if (key) {
      for (const segment of routeSegments(key)) getById(segment.id)?.classList.remove('is-route-highlight');
      const route = homeWorldRoutes[key];
      for (const id of route?.puzzles || []) mechanisms.find((m) => m.getAttribute('data-mechanism') === id)?.classList.remove('is-suggested');
    }
    if (mechanismId) {
      for (const routeKey of Object.keys(homeWorldRoutes)) {
        for (const segment of routeSegments(routeKey)) {
          if (segment.requires === mechanismId) getById(segment.id)?.classList.remove('is-route-highlight');
        }
      }
    }
    hovered = null;
  }

  function setHover(target) {
    clearHover();
    if (!target) return;
    hovered = target;
    target.classList.add('is-hovered');
    const key = target.getAttribute('data-portal');
    const mechanismId = target.getAttribute('data-mechanism');
    if (key) {
      for (const segment of routeSegments(key)) getById(segment.id)?.classList.add('is-route-highlight');
      const route = homeWorldRoutes[key];
      for (const id of route?.puzzles || []) {
        if (!puzzleState[id]) mechanisms.find((m) => m.getAttribute('data-mechanism') === id)?.classList.add('is-suggested');
      }
    }
    if (mechanismId) {
      for (const routeKey of Object.keys(homeWorldRoutes)) {
        for (const segment of routeSegments(routeKey)) {
          if (segment.requires === mechanismId) getById(segment.id)?.classList.add('is-route-highlight');
        }
      }
    }
  }

  function onClick(event) {
    if (Date.now() < suppressClickUntil) return;
    handleActivation(event.target);
  }

  function onKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    if (!target || !svg.contains(target)) return;
    event.preventDefault();
    handleActivation(target);
  }

  function onPointerOver(event) {
    if (event.pointerType === 'touch') return;
    const target = event.target?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    if (target && svg.contains(target)) setHover(target);
  }

  function onPointerOut(event) {
    if (event.pointerType === 'touch') return;
    const from = event.target?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    const to = event.relatedTarget?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    if (from && from === hovered && to !== from) clearHover();
  }

  function onFocusIn(event) {
    const target = event.target?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    if (target && svg.contains(target)) setHover(target);
  }

  function onFocusOut(event) {
    const from = event.target?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    const to = event.relatedTarget?.closest?.('.portal[data-portal], .mechanism[data-mechanism]');
    if (from && from === hovered && to !== from) clearHover();
  }

  function onPointerDown(event) {
    if (!isMobile || event.button > 0) return;
    if (event.target?.closest?.('.portal, .mechanism, .world-mobile-nav')) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startViewBox: { ...currentViewBox },
      moved: false,
    };
    svg.classList.add('is-dragging');
    try { svg.setPointerCapture?.(event.pointerId); } catch { /* optional */ }
  }

  function onPointerMove(event) {
    if (drag && drag.pointerId === event.pointerId) {
      const rect = viewportRect();
      const scale = Math.max(0.001, rect.height / currentViewBox.height);
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) {
        setViewBox({
          ...drag.startViewBox,
          x: drag.startViewBox.x - dx / scale,
          y: drag.startViewBox.y - dy / scale,
        });
        cameraFocus = {
          x: currentViewBox.x + currentViewBox.width / 2,
          y: currentViewBox.y + currentViewBox.height / 2,
        };
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }
    if (options.parallax === false) return;
    if (isMobile || prefersReduced || event.pointerType === 'touch' || event.pointerType === 'pen') return;
    updateParallaxTarget(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickUntil = Date.now() + 180;
    drag = null;
    svg.classList.remove('is-dragging');
    try { svg.releasePointerCapture?.(event.pointerId); } catch { /* optional */ }
    refreshHitTargets();
  }

  let parallaxTarget = { x: 0, y: 0 };
  let parallaxCurrent = { x: 0, y: 0 };
  function updateParallaxTarget(clientX, clientY) {
    const w = Math.max(1, win.innerWidth || 1);
    const h = Math.max(1, win.innerHeight || 1);
    parallaxTarget = {
      x: clamp((clientX / w - 0.5) * 2, -1, 1),
      y: clamp((clientY / h - 0.5) * 2, -1, 1),
    };
    if (!parallaxFrame) parallaxFrame = win.requestAnimationFrame(tickParallax);
  }

  function tickParallax() {
    parallaxCurrent.x += (parallaxTarget.x - parallaxCurrent.x) * 0.08;
    parallaxCurrent.y += (parallaxTarget.y - parallaxCurrent.y) * 0.08;
    const layers = [
      [getById('farWorld'), 0.96],
      [getById('foreground'), -0.32],
    ];
    for (const [layer, strength] of layers) {
      if (!layer) continue;
      const base = originalLayerTransforms.get(layer) || '';
      const tx = round2(parallaxCurrent.x * strength);
      const ty = round2(parallaxCurrent.y * strength);
      layer.setAttribute('transform', `translate(${tx} ${ty})${base ? ` ${base}` : ''}`);
    }
    const settling = Math.abs(parallaxTarget.x - parallaxCurrent.x) + Math.abs(parallaxTarget.y - parallaxCurrent.y);
    if (settling > 0.002 && !isMobile && !prefersReduced && !destroyed) {
      parallaxFrame = win.requestAnimationFrame(tickParallax);
    } else {
      parallaxFrame = 0;
    }
  }

  function buildMobileNav() {
    if (options.mobileNav === false || !host || !doc || mobileNav) return;
    mobileNav = doc.createElement('nav');
    mobileNav.className = 'world-mobile-nav';
    mobileNav.setAttribute('aria-label', 'Explore destinations');
    mobileNav.setAttribute('data-world-mobile-nav', '');
    for (const [key, route] of Object.entries(homeWorldRoutes)) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'world-mobile-nav__item';
      button.textContent = route.label;
      button.setAttribute('data-camera-target', key);
      button.setAttribute('aria-label', `Move camera to ${route.label} portal`);
      mobileNav.appendChild(button);
    }
    mobileNav.addEventListener('click', (event) => {
      const button = event.target.closest?.('[data-camera-target]');
      if (!button) return;
      const key = button.getAttribute('data-camera-target');
      setCamera(key).then(() => announce(`Camera focused on ${homeWorldRoutes[key]?.label || key}. Tap the portal to travel.`));
      for (const item of mobileNav.querySelectorAll('button')) {
        item.setAttribute('aria-current', String(item === button));
      }
    });
    host.appendChild(mobileNav);
  }

  function updateMobileNavVisibility() {
    if (!mobileNav) return;
    mobileNav.hidden = !isMobile;
    mobileNav.setAttribute('aria-hidden', String(!isMobile));
  }

  function onResize() {
    cancelCameraAnimation();
    refreshCamera();
  }

  function resetWorld() {
    if (walking) { announce('Wait for the character to finish walking before resetting the world.'); return false; }
    for (const id of puzzleIds) puzzleState[id] = false;
    applyState();
    saveState();
    if (currentRouteKey && currentNodeId !== 'world-node-home') {
      /* Reset is an explicit developer action; restore the safe start atomically. */
      setCharacterPosition(homePoint, 'world-node-home');
    }
    currentRouteKey = null;
    lastPortalKey = null;
    character?.classList.remove('entering', 'walking');
    setCamera('home', { immediate: true });
    announce('The world has been reset.');
    return true;
  }

  const api = {
    getState: () => ({ ...puzzleState }),
    getCurrentNode: () => currentNodeId,
    getCurrentRoute: () => currentRouteKey,
    isWalking: () => walking,
    setCamera,
    enterPortal,
    returnHome,
    togglePuzzle,
    reset: resetWorld,
    announce,
    destroy,
  };
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    svg.removeEventListener('click', onClick);
    svg.removeEventListener('keydown', onKeyDown);
    svg.removeEventListener('pointerover', onPointerOver);
    svg.removeEventListener('pointerout', onPointerOut);
    svg.removeEventListener('focusin', onFocusIn);
    svg.removeEventListener('focusout', onFocusOut);
    svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove);
    svg.removeEventListener('pointerup', onPointerUp);
    svg.removeEventListener('pointercancel', onPointerUp);
    win.removeEventListener('resize', onResize);
    resizeObserver?.disconnect?.();
    if (walkFrame) win.cancelAnimationFrame(walkFrame);
    walkFrame = 0;
    if (walkResolve) { walkResolve(); walkResolve = null; }
    cancelCameraAnimation();
    if (parallaxFrame) win.cancelAnimationFrame(parallaxFrame);
    if (statusTimer) win.clearTimeout(statusTimer);
    clearHover();
    for (const group of [...portalEls, ...mechanisms]) {
      [...group.children].filter((el) => el.hasAttribute?.('data-runtime-hit-zone')).forEach((el) => el.remove());
    }
    mobileNav?.remove();
    generatedStatus?.remove();
  }

  /* Mount */
  loadState();
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', svg.getAttribute('aria-label') || 'Interactive personal world. Explore portals and mechanisms.');
  buildMobileNav();
  refreshCamera();
  applyState();
  refreshHitTargets();

  svg.addEventListener('click', onClick);
  svg.addEventListener('keydown', onKeyDown);
  svg.addEventListener('pointerover', onPointerOver);
  svg.addEventListener('pointerout', onPointerOut);
  svg.addEventListener('focusin', onFocusIn);
  svg.addEventListener('focusout', onFocusOut);
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  win.addEventListener('resize', onResize, { passive: true });
  if (win.ResizeObserver) {
    resizeObserver = new win.ResizeObserver(onResize);
    resizeObserver.observe(svg);
  }

  return api;
}

export default mountWorldRuntime;
