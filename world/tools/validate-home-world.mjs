/**
 * validate-home-world.mjs 鈥?geometry CI for Home World v0.2.
 *
 *   node tools/validate-home-world.mjs
 *
 * Reads HOME_WORLD.svg (the single geometry truth) and src/content/home-world-routes.js.
 * The build script is NOT trusted here: if the SVG and the routes disagree, this fails.
 *
 * Groups:
 *   A structure & naming
 *   B isometric language
 *   C asset completeness (portal / mechanism / no fill-less black shapes)
 *   D route connectivity (0 px gap solved, real gap unsolved)
 *   E reachability & portal grounding
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { homeWorldRoutes, routeSegments, routeNodeIds } from '../src/content/home-world-routes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = path.join(ROOT, 'HOME_WORLD.svg');

const results = [];
let failed = 0;

function check(group, name, ok, detail = '') {
  results.push({ group, name, ok, detail });
  if (!ok) failed++;
}
const report = (group) => results.filter((r) => r.group === group);

/* ------------------------------------------------------------------- parsing */
function parseSvg(text) {
  const els = [];
  const stack = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^<\/g>$/.test(line)) {
      stack.pop();
      continue;
    }
    const m = line.match(/^<([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>$/);
    if (!m) continue;
    const tag = m[1];
    const attrs = {};
    for (const a of m[2].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    els.push({ tag, attrs, stack: [...stack] });
    if (tag === 'g') {
      if (!line.endsWith('/>')) stack.push(attrs.id || 'g');
      /* self-closing <g/> adds no scope */
    }
  }
  return els;
}

const SVG = fs.readFileSync(SVG_PATH, 'utf8');
const ELS = parseSvg(SVG);

const num = (s) => Number(s);
const points = (s) =>
  s.trim().split(/\s+/).map((p) => p.split(',').map(Number));

/* ------------------------------------------------------------------ geometry */
function inside(poly, pt, eps = 1e-9) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const cr = (bx - ax) * (pt[1] - ay) - (by - ay) * (pt[0] - ax);
    if (Math.abs(cr) <= eps) continue;
    const s = cr > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function sampleLine(a, b, step = 1) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / step));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/* --------------------------------------------------------------- svg indexes */
const byId = new Map();
for (const el of ELS) if (el.attrs.id) byId.set(el.attrs.id, el);

const groups = ELS.filter((e) => e.tag === 'g');
const portals = groups.filter((e) => (e.attrs.class || '').split(/\s+/).includes('portal'));
const mechanisms = groups.filter((e) => (e.attrs.class || '').split(/\s+/).includes('mechanism'));
const masks = groups.filter((e) => (e.attrs.class || '').split(/\s+/).includes('foreground-mask'));
const nodes = new Map();
for (const e of ELS) {
  if (e.tag === 'circle' && (e.attrs.class || '').includes('walk-node')) {
    nodes.set(e.attrs.id, [num(e.attrs.cx), num(e.attrs.cy)]);
  }
}

const surfaces = ELS
  .filter((e) => (e.attrs.class || '').includes('surface') && e.tag === 'polygon')
  .map((e) => ({
    id: e.attrs.id,
    gate: e.attrs['data-gate'] || '',
    poly: points(e.attrs.points),
    layer: e.stack[0],
  }));

const ribbons = ELS.filter((e) => (e.attrs.class || '').includes('path-ribbon'));

/* ============================================================ A. STRUCTURE */
{
  const g = 'A';
  const vb = (SVG.match(/viewBox="([^"]+)"/) || [])[1];
  check(g, 'viewBox is 0 0 1600 1000', vb === '0 0 1600 1000', vb);

  /* Without xmlns, DOMParser('image/svg+xml') + importNode yields null-namespace
     elements and Chromium renders nothing at all (0x0 box). Inline-HTML embedding
     hides this; the runtime's fetch+import path does not. */
  const rootTag = (SVG.match(/<svg\b[^>]*>/) || [''])[0];
  check(g, 'root <svg> declares the SVG namespace',
    /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(rootTag), rootTag.slice(0, 110));
  check(g, 'no markup precedes the root <svg>',
    SVG.trimStart().startsWith('<svg'), SVG.trimStart().slice(0, 40));

  const ids = ELS.map((e) => e.attrs.id).filter(Boolean);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  check(g, 'all ids unique', dup.length === 0, dup.slice(0, 5).join(', '));
  /* structural layer containers keep the blueprint's names; everything else is world-* */
  const STRUCT = new Set(['background', 'farWorld', 'farPaths', 'centralWorld', 'nearPaths',
    'puzzles', 'portals', 'character', 'walkNodes', 'foreground', 'effects',
    'researchWorld', 'architectureWorld', 'travelWorld', 'fashionWorld',
    'lowerArchitecture', 'mainIsland', 'middleArchitecture', 'upperArchitecture',
    'floatingBlocks', 'aboutPuzzle', 'instagramPuzzle', 'githubPuzzle']);
  const badName = ids.filter((id) => !STRUCT.has(id) && !/^world-[a-z0-9]+(-[a-z0-9]+)*$/.test(id));
  check(g, 'every asset id matches world-*', badName.length === 0, badName.slice(0, 5).join(', '));

  const order = ['background', 'farWorld', 'farPaths', 'centralWorld', 'nearPaths', 'puzzles', 'portals', 'character', 'foreground'];
  const idx = order.map((id) => ELS.findIndex((e) => e.attrs.id === id));
  const present = idx.every((i) => i >= 0);
  check(g, 'all mandated layers present', present, order.filter((_, k) => idx[k] < 0).join(', '));
  if (present) {
    const monotonic = idx.every((v, k) => k === 0 || v > idx[k - 1]);
    check(g, 'layer order background<far<...<foreground', monotonic, idx.join(','));
    check(g, 'foreground draws after character',
      idx[8] > idx[7], `foreground@${idx[8]} character@${idx[7]}`);
  }

  const masksPointer = masks.every((m) => m.attrs['pointer-events'] === 'none');
  check(g, 'foreground masks are pointer-events:none', masksPointer,
    masks.filter((m) => m.attrs['pointer-events'] !== 'none').map((m) => m.attrs.id).join(', '));

  const maskChildren = ELS.filter((e) => e.stack.some((s) => s.startsWith('world-mask')));
  check(g, 'no mask can swallow portal clicks',
    maskChildren.every((e) => e.attrs['pointer-events'] === undefined || e.attrs['pointer-events'] === 'none'),
    `${maskChildren.length} mask children`);

  check(g, 'canvas has a background rect', !!byId.get('world-bg-rect'));
}

/* ============================================================ B. ISOMETRIC */
{
  const g = 'B';
  const ground = ELS.filter(
    (e) => e.tag === 'polygon' &&
      (/face-top|bridge-ground/.test(e.attrs.class || ''))
  );
  const bad = [];
  for (const el of ground) {
    const pts = points(el.attrs.points);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      if (Math.abs(dx) < 1e-6) { bad.push(`${el.attrs.id}: vertical edge`); continue; }
      const slope = Math.abs(dy / dx);
      if (Math.abs(slope - 0.5) > 1e-6) bad.push(`${el.attrs.id}: slope ${slope.toFixed(4)}`);
    }
  }
  check(g, `every ground edge has |slope| = 0.5 (${ground.length} polygons)`, bad.length === 0, bad.slice(0, 6).join(' | '));

  const rotated = ELS.filter((e) => /rotate\(/.test(e.attrs.transform || ''));
  check(g, 'no ground element uses a screen rotate() transform', rotated.length === 0,
    rotated.map((e) => e.attrs.id).join(', '));
}

/* ============================================================== C. ASSETS */
{
  const g = 'C';
  const needPortal = ['portal-shadow', 'portal-frame', 'portal-inner', 'portal-core'];
  for (const p of portals) {
    const kids = ELS.filter((e) => e.stack.includes(p.attrs.id));
    const cls = kids.map((k) => k.attrs.class || '');
    const missing = needPortal.filter((c) => !cls.includes(c));
    check(g, `${p.attrs.id} has full portal geometry`, missing.length === 0, missing.join(', '));
    check(g, `${p.attrs.id} exposes data-portal`, !!p.attrs['data-portal'], '');
    check(g, `${p.attrs.id} is keyboard reachable`,
      p.attrs.tabindex === '0' && !!p.attrs['aria-label'], '');
  }
  const needMech = ['mechanism-base', 'mechanism-pivot', 'mechanism-core'];
  for (const m of mechanisms) {
    const kids = ELS.filter((e) => e.stack.includes(m.attrs.id));
    const cls = kids.map((k) => k.attrs.class || '');
    const missing = needMech.filter((c) => !cls.includes(c));
    check(g, `${m.attrs.id} has full mechanism geometry`, missing.length === 0, missing.join(', '));
    check(g, `${m.attrs.id} exposes data-mechanism`, !!m.attrs['data-mechanism'], '');
  }

  /* the v0.1 bug: shapes with no fill and no class render solid black */
  const paintables = ELS.filter((e) => ['polygon', 'path', 'rect', 'circle', 'ellipse'].includes(e.tag));
  const classed = paintables.filter((e) => e.attrs.class || e.attrs.fill || e.attrs.stroke);
  const nameless = paintables.filter((e) => !e.attrs.class && !e.attrs.fill && !e.attrs.stroke);
  check(g, 'no paint-less (black) shapes', nameless.length === 0,
    nameless.slice(0, 6).map((e) => `${e.tag}#${e.attrs.id || '?'}`).join(', '));

  /* every class used must be resolvable in the stylesheet (checked as a text list) */
  const cssPath = path.join(ROOT, 'build', 'home-world.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    const used = new Set();
    for (const e of paintables) for (const c of (e.attrs.class || '').split(/\s+/)) if (c) used.add(c);
    const undefinedClasses = [...used].filter((c) => !new RegExp(`\\.${c}\\b`).test(css));
    check(g, 'every class has a CSS rule', undefinedClasses.length === 0, undefinedClasses.join(', '));
  }
}

/* ============================================================== D. ROUTES */
{
  const g = 'D';
  const staticSurfaces = surfaces.filter((s) => !s.gate);
  const allSurfaces = surfaces;
  const supported = (list, pt) => list.some((s) => inside(s.poly, pt));

  let solvedBad = 0;
  let solvedTotal = 0;
  const detail = [];

  for (const key of Object.keys(homeWorldRoutes)) {
    const ids = routeNodeIds(key);
    const missing = ids.filter((id) => !nodes.has(id));
    check(g, `[${key}] all ${ids.length} walk nodes exist in the SVG`,
      missing.length === 0, missing.join(', '));
    if (missing.length) continue;

    const segs = routeSegments(key);

    /* chain integrity */
    const chained = segs.every((s, i) => i === 0 || segs[i - 1].to === s.from);
    check(g, `[${key}] segments chain head to tail`, chained, '');

    /* solved: 0 px gap */
    let bad = 0;
    for (const s of segs) {
      const a = nodes.get(s.from);
      const b = nodes.get(s.to);
      for (const pt of sampleLine(a, b)) {
        solvedTotal++;
        if (!supported(allSurfaces, pt)) { bad++; solvedBad++; }
      }
    }
    if (bad) detail.push(`${key}: ${bad}px`);
    check(g, `[${key}] solved route has 0 px gap`, bad === 0, `${bad} px unsupported`);

    /* unsolved: every gated segment must actually contain a gap */
    for (const s of segs.filter((x) => x.requires)) {
      const a = nodes.get(s.from);
      const b = nodes.get(s.to);
      const gap = sampleLine(a, b).filter((pt) => !supported(staticSurfaces, pt)).length;
      check(g, `[${key}] segment ${s.index} is a real gap before ${s.requires}`,
        gap > 0, `${gap} px unsupported`);
    }

    /* no ungated ribbon may cross an unsupported region */
    const gatedRibbonIdx = new Set(segs.filter((x) => x.requires).map((x) => x.index));
    for (const rb of ribbons.filter((n) => n.attrs.id.startsWith(`world-path-${key}-`))) {
      const i = Number(rb.attrs.id.split('-').pop());
      const req = rb.attrs['data-requires'] || '';
      if (gatedRibbonIdx.has(i) && !req) {
        check(g, `[${key}] ribbon ${i} is not gated but crosses the gap`, false, rb.attrs.id);
      }
      if (!req) {
        const d = (rb.attrs.d.match(/-?\d+\.?\d*/g) || []).map(Number);
        const a = [d[0], d[1]];
        const b = [d[2], d[3]];
        const badPx = sampleLine(a, b).filter((pt) => !supported(staticSurfaces, pt)).length;
        check(g, `[${key}] ungated ribbon ${i} stays on solid ground`, badPx === 0, `${badPx} px in air`);
      }
    }
  }
  check(g, 'solved route total is fully supported', solvedBad === 0,
    `${solvedBad}/${solvedTotal} px in air ${detail.join(' ')}`);
}

/* ====================================================== E. GROUND & REACH */
{
  const g = 'E';
  const staticSurfaces = surfaces.filter((s) => !s.gate);

  for (const p of portals) {
    const a = (p.attrs['data-anchor'] || '').split(',').map(Number);
    check(g, `${p.attrs.id} stands on a surface`, insideOn(staticSurfaces, a), `${a}`);
  }
  for (const m of mechanisms) {
    const a = (m.attrs['data-anchor'] || '').split(',').map(Number);
    check(g, `${m.attrs.id} stands on a surface`, insideOn(staticSurfaces, a), `${a}`);
  }

  function insideOn(list, pt) {
    return list.some((s) => inside(s.poly, pt));
  }

  /* no foreground mask may cover a portal (they would eat the click) */
  for (const m of masks) {
    const kids = ELS.filter((e) => e.stack.includes(m.attrs.id) && e.tag === 'polygon');
    for (const p of portals) {
      const a = (p.attrs['data-anchor'] || '').split(',').map(Number);
      const covered = kids.some((k) => inside(points(k.attrs.points), a));
      check(g, `${m.attrs.id} does not cover ${p.attrs.id}`, !covered, '');
    }
  }

  /* graph reachability with every gate open */
  const adj = new Map();
  for (const key of Object.keys(homeWorldRoutes)) {
    for (const s of routeSegments(key)) {
      if (!adj.has(s.from)) adj.set(s.from, []);
      adj.get(s.from).push(s.to);
    }
  }
  const start = routeNodeIds('about')[0];
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const nxt of adj.get(cur) || []) if (!seen.has(nxt)) { seen.add(nxt); queue.push(nxt); }
  }
  for (const key of Object.keys(homeWorldRoutes)) {
    const last = routeNodeIds(key).slice(-1)[0];
    check(g, `[${key}] portal is reachable from the character start`, seen.has(last), '');
  }

  /* every route must end on its portal */
  for (const key of Object.keys(homeWorldRoutes)) {
    const route = homeWorldRoutes[key];
    const last = nodes.get(routeNodeIds(key).slice(-1)[0]);
    const portal = byId.get(route.portal);
    const anchor = portal ? (portal.attrs['data-anchor'] || '').split(',').map(Number) : [];
    const dist = last && anchor.length ? Math.hypot(last[0] - anchor[0], last[1] - anchor[1]) : Infinity;
    check(g, `[${key}] route terminates on its portal (<= 8 px)`, dist <= 8, `${dist.toFixed(1)} px`);
  }
}

/* ============================================================ F. PALETTE */
{
  const g = 'F';
  const cssPath = path.join(ROOT, 'build', 'home-world.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const palette = await import('../src/styles/palette.mjs');

  const hits = (text) =>
    palette.FORBIDDEN_LEGACY.filter((hex) => text.toUpperCase().includes(hex.toUpperCase()));

  const svgHits = hits(SVG);
  check(g, 'no legacy warm-sand / coral colour in HOME_WORLD.svg', svgHits.length === 0, svgHits.join(', '));
  const cssHits = hits(css);
  check(g, 'no legacy warm-sand / coral colour in build/home-world.css', cssHits.length === 0, cssHits.join(', '));

  const anchors = ['morandi-red', 'morandi-blue', 'morandi-green', 'world-bg', 'world-text'];
  const missing = anchors.filter((token) => !css.includes(`--${token}:`));
  check(g, 'the five brief anchors exist as CSS variables', missing.length === 0, missing.join(', '));

  const anchorValues = [
    ['--morandi-red', palette.PALETTE['morandi-red'], '#B98587'],
    ['--morandi-blue', palette.PALETTE['morandi-blue'], '#879EAD'],
    ['--morandi-green', palette.PALETTE['morandi-green'], '#899B88'],
    ['--world-bg', palette.PALETTE['world-bg'], '#E9E5DE'],
    ['--world-text', palette.PALETTE['world-text'], '#625D59'],
  ];
  const wrong = anchorValues.filter(([, actual, expected]) => actual.toUpperCase() !== expected.toUpperCase());
  check(g, 'anchor values match the brief exactly', wrong.length === 0,
    wrong.map(([n, a, e]) => `${n}=${a} (want ${e})`).join(', '));

  const literalInBuilder = /#[0-9A-Fa-f]{6}/.test(
    fs.readFileSync(path.join(ROOT, 'tools', 'build-home-world.mjs'), 'utf8')
  );
  check(g, 'the world builder hard-codes no colour literal', !literalInBuilder,
    literalInBuilder ? 'found a #RRGGBB literal in build-home-world.mjs' : '');
}

/* --------------------------------------------------------------------- output */
const GROUPS = {
  A: 'A  structure & naming',
  B: 'B  isometric language',
  C: 'C  asset completeness',
  D: 'D  route connectivity',
  E: 'E  grounding & reachability',
  F: 'F  palette tokens',
};

let current = '';
for (const r of results) {
  if (r.group !== current) {
    current = r.group;
    console.log(`\n${GROUPS[r.group]}`);
    console.log('-'.repeat(64));
  }
  const mark = r.ok ? 'PASS' : 'FAIL';
  const extra = !r.ok && r.detail ? `  <- ${r.detail}` : '';
  console.log(`  ${mark}  ${r.name}${extra}`);
}

const total = results.length;
console.log('\n' + '='.repeat(64));
console.log(`geometry CI: ${total - failed}/${total} checks passed` + (failed ? `  |  ${failed} FAILED` : '  |  all green'));
console.log('='.repeat(64));
process.exit(failed ? 1 : 0);
