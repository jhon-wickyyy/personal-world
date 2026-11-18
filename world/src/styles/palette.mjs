/**
 * palette.mjs — the single colour source for every Home World asset.
 *
 * v0.2.3 Morandi RGB palette. Anchors fixed by the product brief:
 *
 *   Morandi Red    #B98587
 *   Morandi Blue   #879EAD
 *   Morandi Green  #899B88
 *   Background     #E9E5DE
 *   Text           #625D59
 *
 * Rules:
 *   - every tint/shade below is derived from those five anchors, low saturation
 *   - no warm-sand / coral dominant colour survives (the legacy `*-sand*` token
 *     NAMES are kept only because home-world.css and world-runtime.css consume
 *     them; their VALUES are now neutral stone greys)
 *   - builders read PALETTE / FACE / FILL / STROKE; nothing hard-codes a hex
 */

export const PALETTE = {
  /* ---- anchors (do not drift) ---------------------------------------- */
  'morandi-red': '#B98587',
  'morandi-blue': '#879EAD',
  'morandi-green': '#899B88',
  'world-bg': '#E9E5DE',
  'world-text': '#625D59',

  /* ---- neutrals derived from the background --------------------------- */
  'world-bg-mid': '#E0DAD2',
  'world-surface': '#DBD4CA',
  'world-cream': '#F5F1EA',
  'world-sand-light': '#E6E0D8',
  'world-sand': '#CEC5B9',
  'world-sand-dark': '#B2A89B',

  /* ---- Morandi accents ------------------------------------------------ */
  'world-rose': '#B98587',
  'world-rose-light': '#D2A9AB',
  'world-sage': '#899B88',
  'world-sage-dark': '#71826F',
  'world-sage-text': '#495246',
  'world-blue': '#879EAD',
  'world-blue-dark': '#6E8492',
  'world-lilac': '#A9A0AC',
  'world-accent': '#B98587',
  'world-accent-glow': 'rgba(185,133,135,0.28)',

  /* ---- surfaces & type on the background ------------------------------ */
  'world-shadow': 'rgba(98,93,89,0.16)',
  'world-shadow-color': '#625D59',
  'world-shadow-soft': 'rgba(98,93,89,0.08)',
  'world-panel': 'rgba(245,241,234,0.92)',
  'world-outline': 'rgba(98,93,89,0.14)',
  'world-text-muted': 'rgba(98,93,89,0.70)',
};

/** Face colours preserve the same geometry and only change visual treatment. */
export const FACE = {
  main: { top: '#DBD4CA', left: '#CEC5B9', right: '#B2A89B' },
  far: { top: '#E6E0D8', left: '#D3CCC1', right: '#B8AFA2' },
  deco: { top: '#D2D8D0', left: '#A8B4A5', right: '#8C9789' },
};

export const FILL = {
  bridge: '#F5F1EA',
  bridgeLip: '#CEC5B9',
  bridgeEdge: '#B8AEA1',
  mask: '#B2A89B',
  maskLeft: '#93897E',
  maskRight: '#78726A',
  portalFrame: '#B98587',
  portalInner: '#F5F1EA',
  portalCore: '#879EAD',
  mechanismBase: '#899B88',
  mechanismCore: '#F5F1EA',
  character: '#625D59',
  path: '#F5F1EA',
  pathGated: '#D2A9AB',
  tree: '#71826F',
  treeTrunk: '#93897E',
};

export const STROKE = {
  bridgeEdge: '#B8AEA1',
  pathEdge: '#CEC5B9',
};

/** Legacy warm/coral values that must never reappear in generated output. */
export const FORBIDDEN_LEGACY = [
  '#D98278', '#E9A095', '#D9C2A7', '#B99A7D', '#E7D5C0', '#FFF6EC',
  '#F4EEE6', '#C4A3A0', '#B89C72', '#EFE2D2', '#D8BDB9', '#A8B3A3',
  '#879487', '#A7B5BD', '#82949E', '#B6AAB7', '#D8D4CD', '#B8B4AC',
  '#D4D9D1', '#B6B1A8', '#8F8980', '#77736D', '#D8D0C4', '#C9BBAA',
  '#A99C8D', '#E3DBD0', '#5D5A55', '#F4F0E9', '#E1DDD6',
];
