/**
 * home-world.geometry.mjs - Home World v0.2 canonical geometry.
 *
 * EVERYTHING here is plan-space (u, v) + elevation (elev, screen px, decoration only).
 * Screen coordinates are never authored by hand; iso.mjs derives them.
 *
 * Rules:
 *   elev is ONLY allowed on non-walkable decoration. Walkable surfaces sit at elev 0.
 *   A plank always butt-joins a platform edge exactly (no 1px floats).
 *   gated planks carry `gate` = the puzzle id that makes them walkable.
 */

export const WORLD = {
  id: 'home',
  canvas: { w: 1600, h: 1000 },
  origin: { u: 0, v: 0 },

  /* ------------------------------------------------------------------ islands */
  islands: [
    // ---- central -----------------------------------------------------------
    { id: 'world-island-central', u: 0, v: 0, a: 105, h: 80, tone: 'main',
      surface: true, layer: 'mainIsland', label: 'Central island' },

    { id: 'world-building-hub', u: -85, v: -85, a: 32, h: 72, tone: 'main',
      layer: 'middleArchitecture', label: 'Central hub' },

    // ---- near destinations -------------------------------------------------
    { id: 'world-island-about', u: -225, v: 75, a: 45, h: 30, tone: 'main',
      surface: true, layer: 'lowerArchitecture' },

    { id: 'world-island-instagram', u: 0, v: 240, a: 45, h: 34, tone: 'main',
      surface: true, layer: 'lowerArchitecture' },

    { id: 'world-island-github-landing', u: 12, v: -180, a: 30, h: 18, tone: 'main',
      surface: true, layer: 'lowerArchitecture' },

    { id: 'world-island-github', u: 25, v: -300, a: 45, h: 38, tone: 'main',
      surface: true, layer: 'lowerArchitecture' },

    // ---- far worlds --------------------------------------------------------
    { id: 'world-island-research', u: -420, v: -70, a: 50, h: 46, tone: 'far',
      surface: true, layer: 'researchWorld', label: 'Research' },

    { id: 'world-island-architecture', u: 95, v: -450, a: 50, h: 62, tone: 'far',
      surface: true, layer: 'architectureWorld', label: 'Architecture' },

    { id: 'world-island-travel', u: -90, v: 400, a: 45, h: 40, tone: 'far',
      surface: true, layer: 'travelWorld', label: 'Travel' },

    { id: 'world-island-fashion', u: 430, v: -90, a: 45, h: 40, tone: 'far',
      surface: true, layer: 'fashionWorld', label: 'Fashion' },
  ],

  /* ------------------------------------------------------------------ bridges */
  bridges: [
    // near, gated
    { id: 'world-bridge-about', axis: 'u', from: -105, to: -180, fixed: 75,
      gate: 'world-puzzle-about', layer: 'aboutPuzzle', label: 'About rotating bridge' },

    { id: 'world-bridge-instagram', axis: 'v', from: 105, to: 195, fixed: 0,
      gate: 'world-puzzle-instagram', layer: 'instagramPuzzle', label: 'Instagram fold bridge' },

    { id: 'world-bridge-github-a', axis: 'v', from: -105, to: -150, fixed: 0,
      gate: 'world-puzzle-github-a', layer: 'githubPuzzle', label: 'GitHub bridge A' },

    { id: 'world-bridge-github-b', axis: 'v', from: -210, to: -255, fixed: 25,
      gate: 'world-puzzle-github-b', layer: 'githubPuzzle', label: 'GitHub bridge B' },

    // far, always walkable
    { id: 'world-bridge-research', axis: 'u', from: -105, to: -370, fixed: -70,
      gate: null, layer: 'farPaths', label: 'Research causeway' },

    { id: 'world-bridge-architecture', axis: 'v', from: -105, to: -400, fixed: 95,
      gate: null, layer: 'farPaths', label: 'Architecture causeway' },

    { id: 'world-bridge-travel', axis: 'v', from: 105, to: 355, fixed: -90,
      gate: null, layer: 'farPaths', label: 'Travel causeway' },

    { id: 'world-bridge-fashion', axis: 'u', from: 105, to: 385, fixed: -90,
      gate: null, layer: 'farPaths', label: 'Fashion causeway' },
  ],

  /* ------------------------------------------------------------------ puzzles */
  puzzles: [
    { id: 'world-puzzle-about', kind: 'rotateGroundPlank', bridge: 'world-bridge-about',
      portal: 'world-portal-about', layer: 'aboutPuzzle' },
    { id: 'world-puzzle-instagram', kind: 'foldGroundPlank', bridge: 'world-bridge-instagram',
      portal: 'world-portal-instagram', layer: 'instagramPuzzle' },
    { id: 'world-puzzle-github-a', kind: 'rotateGroundPlank', bridge: 'world-bridge-github-a',
      portal: 'world-portal-github', layer: 'githubPuzzle' },
    { id: 'world-puzzle-github-b', kind: 'rotateGroundPlank', bridge: 'world-bridge-github-b',
      portal: 'world-portal-github', layer: 'githubPuzzle' },
  ],

  /* -------------------------------------------------------------- mechanisms */
  mechanisms: [
    { id: 'world-mechanism-about', u: -78, v: 45, puzzle: 'world-puzzle-about',
      layer: 'aboutPuzzle', label: 'Rotate the bridge' },
    { id: 'world-mechanism-instagram', u: 26, v: 78, puzzle: 'world-puzzle-instagram',
      layer: 'instagramPuzzle', label: 'Fold the bridge' },
    { id: 'world-mechanism-github-a', u: 32, v: -96, puzzle: 'world-puzzle-github-a',
      layer: 'githubPuzzle', label: 'Rotate the first bridge' },
    { id: 'world-mechanism-github-b', u: 12, v: -180, puzzle: 'world-puzzle-github-b',
      layer: 'githubPuzzle', label: 'Rotate the second bridge' },
  ],

  /* ------------------------------------------------------------------ portals */
  portals: [
    { id: 'world-portal-about', key: 'about', u: -217, v: 83, scale: 1.0, aria: 'About me',
      destination: { type: 'modal', target: 'about' }, layer: 'portals' },
    { id: 'world-portal-instagram', key: 'instagram', u: 8, v: 248, scale: 0.95, aria: 'Instagram, opens in a new tab',
      destination: { type: 'external', target: 'INSTAGRAM_URL' }, layer: 'portals' },
    { id: 'world-portal-github', key: 'github', u: 33, v: -292, scale: 1.0, aria: 'GitHub, opens in a new tab',
      destination: { type: 'external', target: 'GITHUB_URL' }, layer: 'portals' },
    { id: 'world-portal-research', key: 'research', u: -414, v: -64, scale: 0.82, aria: 'Research world',
      destination: { type: 'scene', target: 'research' }, layer: 'portals' },
    { id: 'world-portal-architecture', key: 'architecture', u: 101, v: -444, scale: 0.82, aria: 'Architecture world',
      destination: { type: 'scene', target: 'architecture' }, layer: 'portals' },
    { id: 'world-portal-travel', key: 'travel', u: -84, v: 406, scale: 0.82, aria: 'Travel world',
      destination: { type: 'scene', target: 'travel' }, layer: 'portals' },
    { id: 'world-portal-fashion', key: 'fashion', u: 436, v: -84, scale: 0.82, aria: 'Fashion world',
      destination: { type: 'scene', target: 'fashion' }, layer: 'portals' },
  ],

  /* --------------------------------------------------------------- decoration */
  decoration: [
    { kind: 'block', id: 'world-deco-upper-block', u: -40, v: -40, a: 48, h: 40,
      elev: -232, layer: 'upperArchitecture', tone: 'main', opening: true },
    { kind: 'block', id: 'world-deco-arch-pillar', u: 180, v: -380, a: 26, h: 110,
      elev: -20, layer: 'architectureWorld', tone: 'far' },
    { kind: 'block', id: 'world-deco-arch-lintel', u: 180, v: -380, a: 42, h: 16,
      elev: -140, layer: 'architectureWorld', tone: 'far' },
    { kind: 'block', id: 'world-deco-fabric', u: 520, v: -150, a: 30, h: 70,
      elev: -30, layer: 'fashionWorld', tone: 'far' },
    { kind: 'block', id: 'world-deco-research-bar', u: -480, v: -150, a: 18, h: 96,
      elev: -25, layer: 'researchWorld', tone: 'far' },
    { kind: 'block', id: 'world-deco-research-bar2', u: -520, v: -40, a: 14, h: 64,
      elev: -25, layer: 'researchWorld', tone: 'far' },
    { kind: 'tree', id: 'world-deco-tree-1', u: -130, v: 370, scale: 1.0, layer: 'travelWorld' },
    { kind: 'tree', id: 'world-deco-tree-2', u: -45, v: 380, scale: 0.8, layer: 'travelWorld' },
    { kind: 'tree', id: 'world-deco-tree-3', u: -150, v: 430, scale: 0.7, layer: 'travelWorld' },
  ],

  /* -------------------------------------------------------- foreground masks */
  masks: [
    { id: 'world-mask-gate', u: -130, v: 64, a: 9, h: 92 },
    { id: 'world-mask-bl', u: 200, v: 850, a: 100, h: 40 },
    { id: 'world-mask-bc', u: 555, v: 555, a: 120, h: 40 },
    { id: 'world-mask-br', u: 835, v: 235, a: 90, h: 40 },
  ],

  /* -------------------------------------------------------------- walk nodes */
  nodes: {
    about: [
      [50, 50], [-10, 57], [-60, 68],
      [-103, 75], [-141, 75], [-180, 75], [-217, 83],
    ],
    instagram: [
      [50, 50], [30, 72], [10, 95],
      [0, 103], [0, 150], [0, 195], [8, 248],
    ],
    github: [
      [50, 50], [30, 10], [12, -60],
      [0, -103], [0, -150], [12, -180], [25, -210], [25, -255], [33, -292],
    ],
    research: [
      [50, 50], [-20, 45], [-70, 20], [-103, -20], [-105, -70],
      [-200, -70], [-300, -70], [-370, -70], [-414, -64],
    ],
    architecture: [
      [50, 50], [70, 10], [80, -50], [95, -103],
      [95, -250], [95, -400], [101, -444],
    ],
    travel: [
      [50, 50], [30, 80], [0, 100], [-90, 103],
      [-90, 230], [-90, 355], [-84, 406],
    ],
    fashion: [
      [50, 50], [70, 20], [100, -60], [105, -90],
      [240, -90], [385, -90], [436, -84],
    ],
  },

  /* ------------------------------------------------------------------ cameras */
  cameras: {
    desktop: { viewBox: [0, 0, 1600, 1000], fit: 'xMidYMid meet' },
    mobile: {
      fit: 'xMidYMid slice',
      height: 760,
      focus: {
        home: [800, 505],
        about: [500, 440],
        instagram: [560, 620],
        github: [1125, 400],
        research: [450, 330],
        architecture: [1330, 330],
        travel: [330, 640],
        fashion: [1300, 640],
      },
    },
  },
};

export default WORLD;
