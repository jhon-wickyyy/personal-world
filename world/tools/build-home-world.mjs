/**
 * build-home-world.mjs — emits HOME_WORLD.svg + build/home-world.css + build/home-world.geometry.json
 *
 *   node tools/build-home-world.mjs
 *
 * The build is a design-time tool. Once HOME_WORLD.svg is written, the SVG is the
 * single geometry truth: routes reference node ids, and tools/validate-home-world.mjs
 * reads the SVG (never this file) to verify the contract.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORLD } from '../src/content/home-world.geometry.mjs';
import { homeWorldRoutes } from '../src/content/home-world-routes.js';
import { S, poly, diamond, plank, block, portalArch, mechanism, tree } from '../src/world/iso.mjs';
import { PALETTE, FACE, FILL, STROKE } from '../src/styles/palette.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build');

/* --------------------------------------------------------------- layer order */
const CONTAINERS = [
  ['background'],
  ['farWorld', 'researchWorld'],
  ['farWorld', 'architectureWorld'],
  ['farWorld', 'travelWorld'],
  ['farWorld', 'fashionWorld'],
  ['farPaths'],
  ['centralWorld', 'lowerArchitecture'],
  ['centralWorld', 'mainIsland'],
  ['centralWorld', 'middleArchitecture'],
  ['centralWorld', 'upperArchitecture'],
  ['centralWorld', 'floatingBlocks'],
  ['nearPaths'],
  ['puzzles', 'aboutPuzzle'],
  ['puzzles', 'instagramPuzzle'],
  ['puzzles', 'githubPuzzle'],
  ['portals'],
  ['character'],
  ['walkNodes'],
  ['foreground'],
  ['effects'],
];

const LAYER_OF = {
  researchWorld: ['farWorld', 'researchWorld'],
  architectureWorld: ['farWorld', 'architectureWorld'],
  travelWorld: ['farWorld', 'travelWorld'],
  fashionWorld: ['farWorld', 'fashionWorld'],
  farPaths: ['farPaths'],
  lowerArchitecture: ['centralWorld', 'lowerArchitecture'],
  mainIsland: ['centralWorld', 'mainIsland'],
  middleArchitecture: ['centralWorld', 'middleArchitecture'],
  upperArchitecture: ['centralWorld', 'upperArchitecture'],
  floatingBlocks: ['centralWorld', 'floatingBlocks'],
  portals: ['portals'],
  aboutPuzzle: ['puzzles', 'aboutPuzzle'],
  instagramPuzzle: ['puzzles', 'instagramPuzzle'],
  githubPuzzle: ['puzzles', 'githubPuzzle'],
};

const items = [];
let seq = 0;

function add(layerKey, depth, svgLines, preview = null) {
  const container = LAYER_OF[layerKey] || [layerKey];
  items.push({ container: container.join('/'), depth, seq: seq++, svg: svgLines, preview });
}

const key = (c) => c.join('/');

/* ------------------------------------------------------------------ helpers */
function facePolys(b, tone, id, opts = {}) {
  const f = FACE[tone];
  const cls = (extra) => `face-${extra}`;
  const surface = opts.surface
    ? ` surface" data-surface="${id}" data-gate="${opts.gate || ''}`
    : '';
  return {
    top: `<polygon id="${id}" class="${cls('top')}${surface}" points="${poly(b.top)}" />`,
    left: `<polygon class="${cls('left')}" points="${poly(b.left)}" />`,
    right: `<polygon class="${cls('right')}" points="${poly(b.right)}" />`,
    fills: [
      { pts: b.left, fill: f.left },
      { pts: b.right, fill: f.right },
      { pts: b.top, fill: f.top, surface: !!opts.surface },
    ],
  };
}

/* --------------------------------------------------------------- background */
items.push({
  container: 'background',
  depth: -1e9,
  seq: seq++,
  svg: [
    `<rect id="world-bg-rect" x="0" y="0" width="1600" height="1000" fill="url(#world-gradient)" />`,
  ],
  preview: null,
});

/* ------------------------------------------------------------------- islands */
for (const isl of WORLD.islands) {
  const b = block(isl.u, isl.v, isl.a, isl.h);
  const f = facePolys(b, isl.tone, isl.id, { surface: isl.surface });
  const depth = isl.u + isl.v;
  add(isl.layer, depth, [f.left, f.right, f.top], f.fills);
}

/* ------------------------------------------------------------------- bridges */
for (const br of WORLD.bridges) {
  const p = plank(br.axis, br.from, br.to, br.fixed, 0, 13);
  const lip = p.map(([x, y]) => [x, y + 4]);
  const mid = (br.from + br.to) / 2;
  const depth = br.axis === 'u' ? mid + br.fixed : br.fixed + mid;
  const gate = br.gate || '';
  const state = gate ? ' data-state="initial"' : '';
  const line =
    `<polygon class="bridge-lip" points="${poly(lip)}" />\n` +
    `<polygon id="${br.id}" class="bridge-ground surface" data-surface="${br.id}" ` +
    `data-gate="${gate}"${state} data-axis="${br.axis}" points="${poly(p)}" />`;
  add(br.layer, depth, [line], [
    { pts: lip, fill: FILL.bridgeLip },
    { pts: p, fill: FILL.bridge, stroke: STROKE.bridgeEdge, surface: true, ghost: !!gate },
  ]);
}

/* ---------------------------------------------------------------- decoration */
for (const d of WORLD.decoration) {
  if (d.kind === 'tree') {
    const t = tree(d.u, d.v, d.scale, 0);
    const depth = d.u + d.v;
    add(d.layer, depth, [
      `<g id="${d.id}" class="deco-tree">`,
      `  <rect class="tree-trunk" x="${t.trunk.x}" y="${t.trunk.y}" width="${t.trunk.w}" height="${t.trunk.h}" />`,
      `  <polygon class="tree-crown" points="${poly(t.crown2)}" />`,
      `  <polygon class="tree-crown" points="${poly(t.crown)}" />`,
      `</g>`,
    ], [
      { pts: t.crown2, fill: FILL.tree },
      { pts: t.crown, fill: FILL.tree },
    ]);
    continue;
  }
  const b = block(d.u, d.v, d.a, d.h, d.elev || 0);
  const f = facePolys(b, d.tone || 'deco', d.id, {});
  const depth = d.u + d.v;
  const lines = [f.left, f.right, f.top];
  const preview = [...f.fills];
  if (d.opening) {
    const [T, R, B, L] = b.top;
    const cx = (T[0] + B[0]) / 2;
    const cy = (T[1] + B[1]) / 2 + d.h * 0.45;
    const w = d.a * 2.1;
    const line = `<rect id="${d.id}-opening" class="upper-opening" x="${(cx - w / 2).toFixed(2)}" ` +
      `y="${(cy - 7).toFixed(2)}" width="${w.toFixed(2)}" height="14" rx="3" />`;
    lines.push(line);
    preview.push({
      pts: [[cx - w / 2, cy - 7], [cx + w / 2, cy - 7], [cx + w / 2, cy + 7], [cx - w / 2, cy + 7]],
      fill: PALETTE['world-cream'],
    });
  }
  add(d.layer, depth, lines, preview);
}

/* ----------------------------------------------------------- foreground mask */
for (const m of WORLD.masks) {
  const b = block(m.u, m.v, m.a, m.h);
  add('foreground', -1e8, [
    `<g id="${m.id}" class="foreground-mask" pointer-events="none" aria-hidden="true">`,
    `  <polygon class="mask-left" points="${poly(b.left)}" />`,
    `  <polygon class="mask-right" points="${poly(b.right)}" />`,
    `  <polygon class="mask-top" points="${poly(b.top)}" />`,
    `</g>`,
  ], [
    { pts: b.left, fill: FILL.maskLeft },
    { pts: b.right, fill: FILL.maskRight },
    { pts: b.top, fill: FILL.mask },
  ]);
}

/* ------------------------------------------------------------------ portals */
for (const p of WORLD.portals) {
  const [x, y] = S(p.u, p.v);
  const a = portalArch(x, y, p.scale);
  add('portals', p.u + p.v, [
    `<g id="${p.id}" class="portal" data-portal="${p.key}" data-anchor="${x.toFixed(2)},${y.toFixed(2)}" role="link" tabindex="0" aria-label="${p.aria || p.key}">`,
    `  <ellipse class="portal-shadow" cx="${a.shadow.cx}" cy="${a.shadow.cy}" rx="${a.shadow.rx.toFixed(2)}" ry="${a.shadow.ry.toFixed(2)}" />`,
    `  <path class="portal-frame" d="${a.frame}" />`,
    `  <path class="portal-inner" d="${a.inner}" />`,
    `  <circle class="portal-core" cx="${a.core.cx}" cy="${a.core.cy.toFixed(2)}" r="${a.core.r.toFixed(2)}" />`,
    `</g>`,
  ], [
    { ellipse: [a.shadow.cx, a.shadow.cy, a.shadow.rx, a.shadow.ry], fill: PALETTE['world-shadow'] },
    { path: a.frame, fill: FILL.portalFrame },
    { path: a.inner, fill: FILL.portalInner },
    { circle: [a.core.cx, a.core.cy, a.core.r], fill: FILL.portalCore },
  ]);
}

/* --------------------------------------------------------------- mechanisms */
for (const m of WORLD.mechanisms) {
  const g = mechanism(m.u, m.v);
  add(m.layer, m.u + m.v, [
    `<g id="${m.id}" class="mechanism" data-mechanism="${m.puzzle}" data-anchor="${g.screen.x.toFixed(2)},${g.screen.y.toFixed(2)}" role="button" tabindex="0" aria-label="${m.label}">`,
    `  <polygon class="mechanism-shadow" points="${poly(g.base)}" />`,
    `  <polygon class="mechanism-base" points="${poly(g.pad)}" />`,
    `  <rect class="mechanism-stem" x="${(g.stem.x - g.stem.w / 2).toFixed(2)}" y="${g.stem.y.toFixed(2)}" width="${g.stem.w}" height="${g.stem.h}" rx="2" />`,
    `  <circle class="mechanism-pivot" cx="${g.ring.cx}" cy="${g.ring.cy.toFixed(2)}" r="${g.ring.r}" />`,
    `  <circle class="mechanism-core" cx="${g.core.cx}" cy="${g.core.cy.toFixed(2)}" r="${g.core.r}" />`,
    `</g>`,
  ], [
    { pts: g.base, fill: PALETTE['world-shadow'] },
    { pts: g.pad, fill: FILL.mechanismBase },
    { circle: [g.ring.cx, g.ring.cy, g.ring.r], fill: FILL.portalFrame },
    { circle: [g.core.cx, g.core.cy, g.core.r], fill: FILL.mechanismCore },
  ]);
}

/* -------------------------------------------------------------- walk nodes */
const nodeIndex = {};
for (const [rkey, list] of Object.entries(WORLD.nodes)) {
  nodeIndex[rkey] = list.map(([u, v]) => S(u, v));
}

/* ------------------------------------------------------------- path ribbons */
const gateOfBridge = Object.fromEntries(WORLD.bridges.map((b) => [b.id, b.gate || '']));
const puzzleToBridge = Object.fromEntries(WORLD.puzzles.map((p) => [p.id, p.bridge]));

for (const [rkey, route] of Object.entries(homeWorldRoutes)) {
  const coords = nodeIndex[rkey];
  if (!coords) throw new Error(`route ${rkey} has no node set`);
  route.segments.forEach((seg, i) => {
    const a = coords[seg.fromIndex];
    const b = coords[seg.toIndex];
    const requires = seg.requires || '';
    const d = `M ${a[0].toFixed(2)} ${a[1].toFixed(2)} L ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
    const cls = requires ? 'path-ribbon is-gated' : 'path-ribbon';
    const attrs = requires
      ? ` data-requires="${requires}" data-hidden="true"`
      : ' data-requires=""';
    add('nearPaths', -1e7 + i, [
      `<path id="world-path-${rkey}-${i}" class="${cls}"${attrs} d="${d}" pointer-events="none" />`,
    ], [{ line: [a, b], stroke: requires ? FILL.pathGated : FILL.path, width: 18, ghost: !!requires }]);
  });
}

/* --------------------------------------------------------------------- order */
const containerOrder = CONTAINERS.map(key);
for (const it of items) {
  if (!containerOrder.includes(it.container)) containerOrder.push(it.container);
}

const grouped = new Map(containerOrder.map((c) => [c, []]));
for (const it of items) grouped.get(it.container).push(it);
for (const list of grouped.values()) list.sort((a, b) => a.depth - b.depth || a.seq - b.seq);

/* ---------------------------------------------------------------- svg string */
const defs = `  <defs>
    <linearGradient id="world-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PALETTE['world-bg']}" />
      <stop offset="62%" stop-color="${PALETTE['world-bg-mid']}" />
      <stop offset="100%" stop-color="${PALETTE['world-sand-light']}" />
    </linearGradient>
    <filter id="world-soft-shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${PALETTE['world-shadow-color']}" flood-opacity="0.14" />
    </filter>
    <filter id="world-portal-glow" x="-120%" y="-120%" width="340%" height="340%">
      <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${PALETTE['world-rose']}" flood-opacity="0.55" />
    </filter>
  </defs>`;

const out = [];
/* xmlns is mandatory: without it, DOMParser('image/svg+xml') puts the whole tree
   in the null namespace, importNode keeps it there, and Chromium renders nothing
   (0x0 box, display:inline). Inline-HTML usage hides the bug; external-SVG use
   does not. tools/validate-home-world.mjs now asserts it. */
out.push(`<svg id="world-home" class="world" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Personal World">`);
out.push(defs);
out.push(`  <g id="world-root">`);

let curPath = [];
function openTo(p) {
  let i = 0;
  while (i < curPath.length && i < p.length && curPath[i] === p[i]) i++;
  for (let j = curPath.length - 1; j >= i; j--) out.push(`${'  '.repeat(j + 2)}</g>`);
  for (let j = i; j < p.length; j++) out.push(`${'  '.repeat(j + 2)}<g id="${p[j]}">`);
  curPath = p;
}

for (const c of containerOrder) {
  const parts = c.split('/');
  openTo(parts);
  const list = grouped.get(c);
  const indent = '  '.repeat(parts.length + 2);
  if (c === 'walkNodes') {
    out.push(`${indent}<g id="world-node-markers" opacity="0" pointer-events="none" aria-hidden="true">`);
    const [hx, hy] = S(50, 50);
    out.push(`${indent}  <circle id="world-node-home" class="walk-node" data-route="home" data-index="0" cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="1.5" />`);
    for (const [rkey, coords] of Object.entries(nodeIndex)) {
      coords.forEach((c2, i) => {
        if (i === 0) return; /* index 0 is world-node-home, shared by every route */
        out.push(`${indent}  <circle id="world-node-${rkey}-${i}" class="walk-node" data-route="${rkey}" data-index="${i}" cx="${c2[0].toFixed(2)}" cy="${c2[1].toFixed(2)}" r="1.5" />`);
      });
    }
    out.push(`${indent}</g>`);
    continue;
  }
  if (c === 'character') {
    const [cx, cy] = S(50, 50);
    out.push(`${indent}<g id="world-character" class="character" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">`);
    out.push(`${indent}  <g id="world-character-facing">`);
    out.push(`${indent}    <ellipse class="character-shadow" cx="0" cy="2" rx="13" ry="4.6" />`);
    out.push(`${indent}    <rect class="character-leg character-leg-a" x="-4.4" y="-14" width="3.4" height="14" rx="1.6" />`);
    out.push(`${indent}    <rect class="character-leg character-leg-b" x="1" y="-14" width="3.4" height="14" rx="1.6" />`);
    out.push(`${indent}    <path class="character-body" d="M 0 -31 L 0 -12" stroke-linecap="round" stroke-width="9" />`);
    out.push(`${indent}    <circle class="character-head" cx="0" cy="-36.5" r="5.8" />`);
    out.push(`${indent}  </g>`);
    out.push(`${indent}</g>`);
    continue;
  }
  for (const it of list) {
    for (const line of it.svg) out.push(`${indent}${line.trim() ? '  ' + line.trim() : ''}`);
  }
}
for (let j = curPath.length - 1; j >= 0; j--) out.push(`${'  '.repeat(j + 2)}</g>`);
out.push(`  </g>`);
out.push(`</svg>`);

/* ------------------------------------------------------------------- outputs */
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(ROOT, 'HOME_WORLD.svg'), out.join('\n') + '\n', 'utf8');

const preview = [];
for (const c of containerOrder) {
  for (const it of grouped.get(c)) {
    for (const p of it.preview || []) preview.push({ layer: c, ...p });
  }
}
fs.writeFileSync(
  path.join(OUT, 'home-world.geometry.json'),
  JSON.stringify({ canvas: WORLD.canvas, nodes: nodeIndex, draw: preview }, null, 0),
  'utf8'
);

const tokenCss = Object.entries(PALETTE).map(([k, v]) => `  --${k}: ${v};`).join('\n');
const css = `/* generated from src/styles/palette.mjs — do not hand-edit */
:root {
${tokenCss}
  --face-main-top: ${FACE.main.top};
  --face-main-left: ${FACE.main.left};
  --face-main-right: ${FACE.main.right};
  --face-far-top: ${FACE.far.top};
  --face-far-left: ${FACE.far.left};
  --face-far-right: ${FACE.far.right};
  --face-deco-top: ${FACE.deco.top};
  --face-deco-left: ${FACE.deco.left};
  --face-deco-right: ${FACE.deco.right};
  --bridge: ${FILL.bridge};
  --bridge-edge: ${STROKE.bridgeEdge};
  --mask: ${FILL.mask};
  --portal-frame: ${FILL.portalFrame};
  --portal-inner: ${FILL.portalInner};
  --portal-core: ${FILL.portalCore};
  --character: ${FILL.character};
  --bridge-lip: ${FILL.bridgeLip};
  --tree-trunk: ${FILL.treeTrunk};
  --mask-left: ${FILL.maskLeft};
  --mask-right: ${FILL.maskRight};
  --mechanism-base: ${FILL.mechanismBase};
  --mechanism-core: ${FILL.mechanismCore};
  --path: ${FILL.path};
  --path-gated: ${FILL.pathGated};
}

body { margin: 0; background: var(--world-bg); }
.world { display: block; width: 100%; height: 100%; }
.world-host { position: fixed; inset: 0; }

/* semantic marker: surfaces are ground, never a click target of their own */
.surface { pointer-events: none; }
.bridge-lip { fill: var(--bridge-lip); }
.upper-opening { fill: var(--world-cream); opacity: .92; }
.walk-node { display: none; }
.tree-trunk { fill: var(--tree-trunk); }
.tree-crown { fill: var(--world-sage); opacity: .85; }

/* faces */
.face-top { fill: var(--face-main-top); }
.face-left { fill: var(--face-main-left); }
.face-right { fill: var(--face-main-right); }
#farWorld .face-top { fill: var(--face-far-top); }
#farWorld .face-left { fill: var(--face-far-left); }
#farWorld .face-right { fill: var(--face-far-right); }
#upperArchitecture .face-top, #floatingBlocks .face-top { fill: var(--face-deco-top); }
#upperArchitecture .face-left, #floatingBlocks .face-left { fill: var(--face-deco-left); }
#upperArchitecture .face-right, #floatingBlocks .face-right { fill: var(--face-deco-right); }

/* ground bridges */
.bridge-ground { fill: var(--bridge); stroke: var(--bridge-edge); stroke-width: 1; }
.bridge-ground[data-gate]:not([data-gate=""]) {
  opacity: 0;
  pointer-events: none;
  transition: opacity .45s ease;
}
.bridge-ground[data-gate]:not([data-gate=""]).is-open { opacity: 1; pointer-events: auto; }

/* path ribbons */
.path-ribbon {
  fill: none;
  stroke: var(--path);
  stroke-width: 18;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .92;
  pointer-events: none;
}
.path-ribbon.is-gated { opacity: 0; transition: opacity .45s ease; }
.path-ribbon.is-gated.is-open { opacity: .92; stroke: var(--path-gated); }
.path-ribbon.is-dim { opacity: .35; }

/* portals */
.portal { cursor: pointer; transform-box: fill-box; transform-origin: 50% 100%; }
.portal-shadow { fill: var(--world-shadow); }
.portal-frame { fill: var(--portal-frame); }
.portal-inner { fill: var(--portal-inner); }
.portal-core { fill: var(--portal-core); }
.portal:hover .portal-frame, .portal:focus-visible .portal-frame { filter: url(#world-portal-glow); }
.portal.is-locked { opacity: .85; }
.portal.is-muted { opacity: .8; }
.portal.is-active .portal-inner { fill: var(--world-cream); }

/* mechanisms */
.mechanism { cursor: pointer; transform-box: fill-box; transform-origin: 50% 100%; }
.mechanism-shadow { fill: var(--world-shadow); }
.mechanism-base { fill: var(--mechanism-base); }
.mechanism-stem { fill: var(--mechanism-base); }
.mechanism-pivot { fill: var(--world-rose-light); }
.mechanism-core { fill: var(--mechanism-core); }
.mechanism:hover { transform: scale(1.06); }
.mechanism.is-solved .mechanism-core { fill: var(--world-rose-light); }

/* character */
.character-shadow { fill: var(--world-shadow); }
.character-body, .character-leg { fill: var(--character); stroke: var(--character); }
.character-head { fill: var(--character); }
.character.walking .character-leg-a { animation: world-step .38s ease-in-out infinite alternate; }
.character.walking .character-leg-b { animation: world-step .38s ease-in-out infinite alternate-reverse; }
.character.walking #world-character-facing { animation: world-bob .38s ease-in-out infinite alternate; }
.character.entering { opacity: 0; transition: opacity .4s ease; }
@keyframes world-step { from { transform: translateY(0); } to { transform: translateY(-2.5px); } }
@keyframes world-bob { from { transform: translateY(0); } to { transform: translateY(-1.5px); } }

/* foreground */
.foreground-mask polygon { stroke: none; }
.mask-top { fill: var(--mask); }
.mask-left { fill: var(--mask-left); }
.mask-right { fill: var(--mask-right); }

/* accessibility */
.portal:focus-visible, .mechanism:focus-visible {
  outline: none;
  stroke: var(--world-text);
  stroke-width: 2;
  paint-order: stroke;
}
.skip-link {
  position: absolute; left: 12px; top: 12px;
  transform: translateY(-160%);
  padding: 8px 14px; border-radius: 8px;
  background: var(--world-cream); color: var(--world-text);
  font: 500 14px/1.2 system-ui, sans-serif; text-decoration: none;
  z-index: 10;
}
.skip-link:focus { transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .character.walking .character-leg-a,
  .character.walking .character-leg-b,
  .character.walking #world-character-facing { animation: none; }
  * { transition-duration: .01ms !important; }
}
`;
fs.writeFileSync(path.join(OUT, 'home-world.css'), css, 'utf8');

console.log(`HOME_WORLD.svg          ${out.length} lines`);
console.log(`build/home-world.css    ${css.split('\n').length} lines`);
console.log(`build/home-world.geometry.json  ${preview.length} draw ops`);
