/**
 * shots.mjs -real-browser capture + smoke checks for the site skeleton.
 *
 *   node tools/shots.mjs            # build must already exist in dist/
 *
 * Serves dist/ with `vite preview`, then drives Chromium: screenshots of every
 * route (desktop + 390x844 mobile) and a few end-to-end behaviours that jsdom
 * cannot prove (puzzle click, portal navigation, state restore).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
const record = (id, name, ok, detail = '') => {
  results.push({ id, name, ok: !!ok, detail: String(detail ?? '') });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${id}] ${name}${!ok && detail ? `  <- ${detail}` : ''}`);
};

fs.mkdirSync(SHOTS, { recursive: true });

/* - preview server */
const logPath = path.join(SHOTS, 'server.log');
const logFd = fs.openSync(logPath, 'w');
const server = spawn(
  process.execPath,
  [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', logFd, logFd] }
);

/** the server must be up before we drive the browser; fail loudly if it is not */
let serverUp = false;
for (let i = 0; i < 160; i++) {
  try {
    const r = await fetch(BASE + '/');
    if (r.ok) { serverUp = true; break; }
  } catch { /* starting */ }
  if (server.exitCode !== null) break;
  await sleep(150);
}
if (!serverUp) {
  server.kill();
  console.error(`preview server failed to start on ${BASE}\n--- ${logPath} ---\n${fs.readFileSync(logPath, 'utf8')}`);
  process.exit(2);
}

const { proc, userDir, wsUrl, version } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1600, height: 1000 } });
console.log(`\nPersonal World -route capture\n${'='.repeat(60)}\n  chromium: ${version}\n`);

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

const shot = async (name) => {
  await page.screenshot(path.join(SHOTS, `${name}.png`));
  return `shots/${name}.png`;
};

const go = async (pathname, { waitForWorld = false } = {}) => {
  await page.send('Page.navigate', { url: BASE + pathname });
  await page.waitFor(`document.querySelector('main')`, { timeout: 20000, label: `main on ${pathname}` });
  if (waitForWorld) {
    await page.waitFor(`document.querySelector('#world-home')`, { timeout: 20000, label: 'world mount' });
    await sleep(900);
  } else {
    await sleep(400);
  }
};

try {
  /* - 1. desktop routes */
  await go('/', { waitForWorld: true });
  const world = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    const box = svg.getBoundingClientRect();
    return {
      ns: svg.namespaceURI,
      imgTags: document.querySelectorAll('#world-home image, img').length,
      portals: svg.querySelectorAll('.portal').length,
      mechanisms: svg.querySelectorAll('.mechanism').length,
      box: [Math.round(box.width), Math.round(box.height)],
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      inline: !!svg.closest('.home-world'),
    };
  })()`);
  record('H1', 'world is inline SVG in its own namespace', world.ns === 'http://www.w3.org/2000/svg' && world.inline && world.imgTags === 0, JSON.stringify(world));
  record('H2', 'world fills the viewport on /', world.box[0] >= 1200 && world.box[1] >= 700, world.box.join('x'));
  record('H3', 'frozen inventory intact (7 portals / 4 mechanisms)', world.portals === 7 && world.mechanisms === 4, `${world.portals}/${world.mechanisms}`);
  const homeShot = await shot('01-home-desktop');

  /* - 2. real interaction checks */
  const mechHit = await page.click('#world-mechanism-about');
  /* the GSAP timeline runs ~0.6s: assert the resting state, not a mid-frame value */
  await page
    .waitFor(
      "Number(getComputedStyle(document.querySelector('#world-bridge-about')).opacity) > 0.95",
      { timeout: 4000, label: 'bridge settle' }
    )
    .catch(() => {});
  await sleep(120);
  const opened = await page.evaluate(`(() => {
    const bridge = document.querySelector('#world-bridge-about');
    return { open: bridge.classList.contains('is-open'), opacity: Number(getComputedStyle(bridge).opacity) };
  })()`);
  record('H4', 'a real click on a mechanism opens its bridge', mechHit.topWithin && opened.open && opened.opacity > 0.9, JSON.stringify(opened));

  /* catch the character mid-walk across the freshly opened bridge */
  await page.click('#world-portal-about');
  await sleep(1150);
  const inFlight = await page.evaluate(`(() => {
    const c = document.querySelector('#world-character');
    return {
      walking: !!document.querySelector('#world-character.walking'),
      transform: c ? c.getAttribute('transform') : null,
      bridgeOpen: document.querySelector('#world-bridge-about').classList.contains('is-open'),
      portalActive: !!document.querySelector('#world-portal-about.is-active'),
    };
  })()`);
  const puzzleShot = await shot('10-home-puzzle-open');
  record('H4b', 'character walks across the open bridge', inFlight.walking && inFlight.bridgeOpen, JSON.stringify(inFlight));

  /* portal -> route change */
  await page.click('#world-portal-about');
  await page.waitFor(`location.pathname === '/about'`, { timeout: 30000, label: 'navigate to /about' }).catch(() => {});
  const aboutPath = await page.evaluate('location.pathname');
  record('H5', 'reaching a portal navigates with React Router', aboutPath === '/about', aboutPath);
  const aboutShot = await shot('02-about');

  /* back to the world: puzzle state must be restored */
  await go('/', { waitForWorld: true });
  const restored = await page.evaluate(`(() => {
    const bridge = document.querySelector('#world-bridge-about');
    return { open: bridge.classList.contains('is-open'), node: window.localStorage.getItem('personal-world:home:v2') ? true : false };
  })()`);
  record('H6', 'returning to / restores the solved bridge', restored.open && restored.node, JSON.stringify(restored));

  /* - 3. other routes (desktop) */
  const routes = [
    ['/architecture', '03-architecture'],
    ['/travel', '04-travel'],
    ['/research', '05-research'],
    ['/fashion', '06-fashion'],
    ['/nowhere', '07-404'],
  ];
  const shots = [homeShot, aboutShot, puzzleShot];
  for (const [pathname, name] of routes) {
    await go(pathname);
    const info = await page.evaluate(`(() => ({
      main: document.querySelectorAll('main').length,
      h1: (document.querySelector('h1') || {}).textContent || '',
      pending: document.querySelectorAll('.pending').length,
      nav: document.querySelectorAll('.site-nav__link').length,
    }))()`);
    record(`R${routes.findIndex((r) => r[0] === pathname) + 1}`, `${pathname} renders one main, one h1, nav intact`,
      info.main === 1 && info.h1.length > 0 && info.nav === 6, JSON.stringify(info));
    shots.push(await shot(name));
  }

  /* - 4. mobile */
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await go('/', { waitForWorld: true });
  const mobile = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    const vb = (svg.getAttribute('viewBox') || '').split(/\\s+/).map(Number);
    const dock = document.querySelector('[data-camera-target]');
    const targets = [...svg.querySelectorAll('.portal, .mechanism')].map((el) => {
      const r = el.getBoundingClientRect();
      return Math.round(Math.min(r.width, r.height));
    });
    return { viewBox: vb, dock: !!dock, minTarget: Math.min(...targets), w: innerWidth, h: innerHeight };
  })()`);
  record('M1', 'mobile uses a camera crop, not the full world', mobile.viewBox[3] <= 900 && mobile.viewBox[2] < 1200, JSON.stringify(mobile.viewBox));
  record('M2', 'mobile keeps the camera dock and 44px targets', mobile.dock && mobile.minTarget >= 44, `min=${mobile.minTarget}`);
  shots.push(await shot('08-home-mobile'));

  await go('/about');
  shots.push(await shot('09-about-mobile'));

  await go('/architecture');
  const mobileWork = await page.evaluate(
    "(() => ({" +
    "  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1," +
    "  h1: (document.querySelector('h1') || {}).textContent," +
    "  pending: document.querySelectorAll('.pending').length," +
    "  frames: document.querySelectorAll('.gallery__item').length," +
    "}))()"
  );
  shots.push(await shot('11-architecture-mobile'));
  record('M3', 'mobile work page fits without horizontal overflow', !mobileWork.overflowX, JSON.stringify(mobileWork));

  record('E1', 'no console errors across all routes', errors.length === 0, errors.slice(0, 3).join(' | '));

  fs.writeFileSync(
    path.join(ROOT, 'shots', 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), chromium: version, results, shots }, null, 2)
  );
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`route capture: ${results.length - failed.length}/${results.length} passed${failed.length ? `  |  ${failed.length} FAILED` : '  |  all green'}`);
  console.log(`${shots.length} screenshots in shots/`);
  process.exitCode = failed.length ? 1 : 0;
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(250);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
