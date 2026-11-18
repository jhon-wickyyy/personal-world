/**
 * verify-phase04.mjs — PC-only acceptance for the three-world build.
 *
 *   node tools/verify-phase04.mjs
 *
 * Checks: Fashion is gone, the three worlds route correctly, Architecture runs
 * its dedicated scene, Travel/Research keep the generic fold, About is intact,
 * and prefers-reduced-motion still bypasses everything.
 * Screenshots: shots/p04-*.png at 1920x1080 / 1440x900 / 1366x768.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 4180);
const BASE = `http://127.0.0.1:${PORT}`;
const INTRO_KEY = 'personal-world:intro-seen:v1';

const results = [];
const record = (id, name, ok, detail = '') => {
  results.push({ id, name, ok: !!ok, detail: String(detail ?? '') });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${id}] ${name}${!ok && detail ? `  <- ${detail}` : ''}`);
};

const logFd = fs.openSync(path.join(SHOTS, 'verify-phase04.log'), 'w');
const server = spawn(
  process.execPath,
  [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', logFd, logFd] }
);
let up = false;
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + '/')).ok) { up = true; break; } } catch { /* starting */ }
  if (server.exitCode !== null) break;
  await sleep(150);
}
if (!up) {
  console.error(fs.readFileSync(path.join(SHOTS, 'verify-phase04.log'), 'utf8'));
  process.exit(2);
}

const { proc, userDir, wsUrl, version } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1440, height: 900 } });
console.log(`\nPhase 04 · three worlds, PC sizes\n${'='.repeat(56)}\n  chromium: ${version}\n`);

const errors = [];
page.onEvent = (msg) => {
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    const t = msg.params.entry.text || '';
    if (!/favicon/i.test(t)) errors.push(t);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  }
};

const waitFor = (expr, label, timeout = 15000) =>
  page.waitFor(expr, { timeout, label }).then(() => true).catch(() => false);

const layerState = () =>
  page.evaluate(
    "(() => { const l = document.querySelector('.scene-transition'); if (!l) return { present: false };" +
    "  return { present: true, scene: l.getAttribute('data-scene'), state: l.getAttribute('data-state')," +
    "           hidden: l.getAttribute('aria-hidden')," +
    "           archActive: !!document.querySelector('.transition-arch[data-active=\"true\"]')," +
    "           glow: (() => { const g = document.querySelector('.transition-arch__glow'); return g ? Number(getComputedStyle(g).opacity) : null; })()," +
    "           grid: (() => { const g = document.querySelector('.transition-arch__grid'); return g ? Number(getComputedStyle(g).opacity) : null; })() }; })()"
  );

async function runTransition(key, shots = []) {
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'mount', 20000);
  await sleep(700);

  const hasMechanism = await page.evaluate(`!!document.querySelector('#world-mechanism-${key}')`);
  if (hasMechanism) {
    await page.click(`#world-mechanism-${key}`);
    await waitFor(`document.querySelector('#world-bridge-${key}')?.classList.contains('is-open')`, 'mechanism', 6000);
    await sleep(140);
  }

  const hit = await page.click(`#world-portal-${key}`);
  const covering = await waitFor(
    "document.querySelector('.scene-transition')?.getAttribute('data-state') === 'covering'",
    `${key} covering`,
    20000
  );

  const frames = [];
  for (const [delay, name] of shots) {
    await sleep(delay);
    frames.push({ name, state: await layerState() });
    await page.screenshot(path.join(SHOTS, `${name}.png`));
    if (delay < 0) break;
  }

  const during = await layerState();
  const navigated = await waitFor(`location.pathname === '/${key}'`, `${key} route`, 15000);
  await waitFor(
    "document.querySelector('.scene-transition')?.getAttribute('aria-hidden') === 'true'",
    `${key} released`,
    15000
  );
  return { hit: hit.topWithin, covering, during, frames, navigated };
}

try {
  /* --------------------------------------------------- Fashion is gone */
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'mount', 20000);
  await page.evaluate(`localStorage.setItem(${JSON.stringify(INTRO_KEY)}, '1')`);
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'remount', 20000);
  await sleep(400);

  const structure = await page.evaluate(
    "(() => ({ nav: [...document.querySelectorAll('.site-nav__link')].map((a) => a.textContent)," +
    "  portals: [...document.querySelectorAll('#world-home .portal')].map((p) => p.getAttribute('data-portal')) }))()"
  );
  record('S1', 'navigation lists three worlds, no Fashion',
    !structure.nav.includes('Fashion') && structure.nav.includes('Architecture') &&
    structure.nav.includes('Travel') && structure.nav.includes('Research'),
    JSON.stringify(structure.nav));
  /* the gate itself lives in the frozen SVG: it stays, but must be dormant */
  const fashionGate = await page.evaluate(
    "(() => { const p = document.querySelector('.portal[data-portal=\"fashion\"]');" +
    "  if (!p) return null; const r = p.getBoundingClientRect();" +
    "  return { opacity: Number(getComputedStyle(p).opacity), w: Math.round(r.width), h: Math.round(r.height) }; })()"
  );
  record('S2', 'the retired Fashion gate stays in the frozen world but is dimmed',
    !!fashionGate && fashionGate.opacity < 0.5 && fashionGate.w > 0,
    JSON.stringify(fashionGate));

  await page.send('Page.navigate', { url: BASE + '/fashion' });
  await waitFor("document.querySelector('main')", 'fashion route', 15000);
  const fashionRoute = await page.evaluate('({ path: location.pathname, h1: (document.querySelector("h1") || {}).textContent })');
  record('S3', '/fashion no longer resolves to a page', /does not exist/i.test(fashionRoute.h1 || ''), JSON.stringify(fashionRoute));

  /* ------------------------------------- architecture at three PC sizes */
  const sizes = [
    [1920, 1080, 'p04-arch-1920'],
    [1440, 900, 'p04-arch-1440'],
    [1366, 768, 'p04-arch-1366'],
  ];
  for (const [w, h, shotName] of sizes) {
    await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const run = await runTransition('architecture', [[430, shotName]]);
    const frame = run.frames[0]?.state ?? {};
    const overflow = await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1');
    record(`A-${w}`, `${w}x${h}: architecture scene runs, no overflow`,
      run.covering && run.navigated && frame.scene === 'architecture' && frame.archActive && !overflow,
      JSON.stringify({ scene: frame.scene, archActive: frame.archActive, glow: frame.glow, grid: frame.grid, overflow }));
  }

  /* ------------------------------- travel / research keep the generic fold */
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const travelRun = await runTransition('travel', [[300, 'p04-travel']]);
  record('T1', 'Travel keeps the generic transition',
    travelRun.covering && travelRun.navigated && travelRun.frames[0].state.scene === 'generic',
    JSON.stringify({ scene: travelRun.frames[0].state.scene, nav: travelRun.navigated }));

  const researchRun = await runTransition('research', [[300, 'p04-research']]);
  record('R1', 'Research keeps the generic transition',
    researchRun.covering && researchRun.navigated && researchRun.frames[0].state.scene === 'generic',
    JSON.stringify({ scene: researchRun.frames[0].state.scene, nav: researchRun.navigated }));

  /* ------------------------------------------------ About not regressed */
  const aboutRun = await runTransition('about', [[300, 'p04-about']]);
  record('B1', 'About still transitions with the generic fold',
    aboutRun.covering && aboutRun.navigated && aboutRun.frames[0].state.scene === 'generic',
    JSON.stringify({ scene: aboutRun.frames[0].state.scene, nav: aboutRun.navigated }));

  /* -------------------------------------------------- reduced motion */
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'reduced mount', 20000);
  await sleep(700);
  const reducedIntro = await page.evaluate(
    "(() => ({ skip: !!document.querySelector('.home-intro-skip'), scale: getComputedStyle(document.querySelector('#world-home')).transform }))()"
  );
  await page.click('#world-portal-architecture');
  const instant = await waitFor("location.pathname === '/architecture'", 'reduced route', 10000);
  const reducedLayer = await layerState();
  record('M1', 'reduced motion: intro skipped, no transition scene',
    !reducedIntro.skip && reducedIntro.scale === 'none' && instant && reducedLayer.hidden === 'true',
    JSON.stringify({ intro: reducedIntro, instant, layer: reducedLayer }));

  record('E1', 'no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(56)}`);
  console.log(`phase 04: ${results.length - failed.length}/${results.length} passed${failed.length ? `  |  ${failed.length} FAILED` : '  |  all green'}`);
  process.exitCode = failed.length ? 1 : 0;
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(250);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
