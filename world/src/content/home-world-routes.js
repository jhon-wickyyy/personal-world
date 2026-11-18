/**
 * home-world-routes.js — Home World v0.2 route data.
 *
 * A route is a chain of walk nodes that ALREADY EXIST IN HOME_WORLD.svg
 * (`#world-node-<route>-<i>`). This file never stores coordinates: the SVG is
 * the single geometry truth, the route only stores topology + unlock conditions.
 *
 * A segment's `requires` is the puzzle id that must be solved before the
 * character may traverse it. A segment with no `requires` is always walkable.
 * Adjacent segments must chain (toIndex[n] === fromIndex[n+1]).
 */

/**
 * The character has exactly ONE home node. Every route starts there, which is
 * what makes the route graph connected (validated by group E).
 */
const HOME = 'world-node-home';

const nodeIds = (route, count) => [
  HOME,
  ...Array.from({ length: count - 1 }, (_, i) => `world-node-${route}-${i + 1}`),
];

const free = (fromIndex, toIndex) => ({ fromIndex, toIndex, requires: null });
const gated = (fromIndex, toIndex, requires) => ({ fromIndex, toIndex, requires });

export const homeWorldRoutes = {
  /* ------------------------------------------------------------- near, gated */
  about: {
    label: 'About',
    portal: 'world-portal-about',
    puzzles: ['world-puzzle-about'],
    segments: [
      free(0, 1), free(1, 2), free(2, 3),
      gated(3, 4, 'world-puzzle-about'),
      gated(4, 5, 'world-puzzle-about'),
      free(5, 6),
    ],
    nodeCount: 7,
  },

  instagram: {
    label: 'Instagram',
    portal: 'world-portal-instagram',
    puzzles: ['world-puzzle-instagram'],
    segments: [
      free(0, 1), free(1, 2), free(2, 3),
      gated(3, 4, 'world-puzzle-instagram'),
      gated(4, 5, 'world-puzzle-instagram'),
      free(5, 6),
    ],
    nodeCount: 7,
  },

  github: {
    label: 'GitHub',
    portal: 'world-portal-github',
    puzzles: ['world-puzzle-github-a', 'world-puzzle-github-b'],
    segments: [
      free(0, 1), free(1, 2), free(2, 3),
      gated(3, 4, 'world-puzzle-github-a'),
      free(4, 5), free(5, 6),
      gated(6, 7, 'world-puzzle-github-b'),
      free(7, 8),
    ],
    nodeCount: 9,
  },

  /* -------------------------------------------------------- far, always open */
  research: {
    label: 'Research',
    portal: 'world-portal-research',
    puzzles: [],
    segments: [free(0, 1), free(1, 2), free(2, 3), free(3, 4), free(4, 5), free(5, 6), free(6, 7), free(7, 8)],
    nodeCount: 9,
  },

  architecture: {
    label: 'Architecture',
    portal: 'world-portal-architecture',
    puzzles: [],
    segments: [free(0, 1), free(1, 2), free(2, 3), free(3, 4), free(4, 5), free(5, 6)],
    nodeCount: 7,
  },

  travel: {
    label: 'Travel',
    portal: 'world-portal-travel',
    puzzles: [],
    segments: [free(0, 1), free(1, 2), free(2, 3), free(3, 4), free(4, 5), free(5, 6)],
    nodeCount: 7,
  },

  fashion: {
    label: 'Fashion',
    portal: 'world-portal-fashion',
    puzzles: [],
    segments: [free(0, 1), free(1, 2), free(2, 3), free(3, 4), free(4, 5), free(5, 6)],
    nodeCount: 7,
  },
};

/** ordered node ids for a route — resolved against the SVG at runtime */
export function routeNodeIds(routeKey) {
  const r = homeWorldRoutes[routeKey];
  if (!r) return [];
  return nodeIds(routeKey, r.nodeCount);
}

/** segments of one route with node ids attached */
export function routeSegments(routeKey) {
  const r = homeWorldRoutes[routeKey];
  if (!r) return [];
  const ids = routeNodeIds(routeKey);
  return r.segments.map((s, i) => ({
    index: i,
    id: `world-path-${routeKey}-${i}`,
    from: ids[s.fromIndex],
    to: ids[s.toIndex],
    requires: s.requires,
  }));
}

/** true when every segment of the route is currently walkable */
export function routeIsOpen(routeKey, isSolved) {
  return routeSegments(routeKey).every((s) => !s.requires || isSolved(s.requires));
}

/** the longest contiguous walkable prefix — what a blocked click should walk */
export function walkablePrefix(routeKey, isSolved) {
  const segs = routeSegments(routeKey);
  const out = [];
  for (const s of segs) {
    if (s.requires && !isSolved(s.requires)) break;
    if (!out.length) out.push(s.from);
    out.push(s.to);
  }
  return out;
}

export default homeWorldRoutes;
