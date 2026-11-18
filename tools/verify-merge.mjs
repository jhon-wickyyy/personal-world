/**
 * verify-phase02.mjs 鈥?the five Phase 02 acceptance items, in a real Chromium.
 *
 *   node tools/verify-phase02.mjs
 *
 * Covers: intro + skip, About portal scene transition, 390x844 far portal
 * transition, prefers-reduced-motion bypass. Screenshots land in shots/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 4178);
const BASE = `http://127.0.0.1:${PORT}`;
const INTRO_KEY = 'personal-world:intro-seen:v1';

const results = [];
const record = (id, name, ok, detail = '') => {
  results.push({ id, name, ok: !!ok, detail: String(detail ?? '') });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${id}] ${name}${!ok && detail ? `  <- ${detail}` : ''}`);
};
const shot = async (page, name) => {
  await page.screenshot(path.join(SHOTS, `${name}.png`));
  console.log(`         ${name}.png`);
};

const logFd = fs.openSync(path.join(SHOTS, 'verify-phase02.log'), 'w');
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
  console.error(fs.readFileSync(path.join(SHOTS, 'verify-phase02.log'), 'utf8'));
  process.exit(2);
}

const { proc, userDir, wsUrl, version } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1600, height: 1000 } });
console.log(`\nPhase 02 acceptance\n${'='.repeat(56)}\n  chromium: ${version}\n`);

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

const waitFor = (expression, label, timeout = 8000) =>
  page.waitFor(expression, { timeout, label }).then(() => true).catch(() => false);

const clearIntroAndReload = async () => {
  /* localStorage needs a real origin first: about:blank denies access */
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'world mount (pre-clear)', 20000);
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(INTRO_KEY)})`);
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'world mount', 20000);
  await sleep(120);
};

const transitionState = () =>
  page.evaluate(`(() => {
    const layer = document.querySelector('.scene-transition');
    if (!layer) return { present: false };
    return {
      present: true,
      state: layer.getAttribute('data-state'),
      hidden: layer.getAttribute('aria-hidden'),
      display: getComputedStyle(layer).display,
      opacity: Number(getComputedStyle(layer).opacity),
      label: (layer.querySelector('.scene-transition__label') || {}).textContent,
      originX: layer.style.getPropertyValue('--transition-origin-x'),
      originY: layer.style.getPropertyValue('--transition-origin-y'),
      destination: layer.getAttribute('data-destination'),
    };
  })()`);

try {
  /* ---------------------------------------------- 1. intro + skip control */
  await clearIntroAndReload();
  const intro = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    const skip = document.querySelector('.home-intro-skip');
    return {
      skip: !!skip,
      skipLabel: skip ? skip.textContent.trim() : null,
      transform: getComputedStyle(svg).transform,
      stored: localStorage.getItem(${JSON.stringify(INTRO_KEY)}),
      farOpacity: Number(getComputedStyle(svg.querySelector('#farWorld')).opacity),
    };
  })()`);
  record('I1', 'first visit plays the intro (scaled + faded in)', intro.skip && intro.transform !== 'none', JSON.stringify(intro));
  record('I2', 'Skip intro control is present and not yet stored', intro.skipLabel === 'Skip intro' && intro.stored === null, JSON.stringify({ label: intro.skipLabel, stored: intro.stored }));
  await shot(page, 'p02-01-intro-playing');

  await page.click('.home-intro-skip');
  await sleep(420);
  const skipped = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    return {
      skipGone: !document.querySelector('.home-intro-skip'),
      transform: getComputedStyle(svg).transform,
      stored: localStorage.getItem(${JSON.stringify(INTRO_KEY)}),
      farOpacity: Number(getComputedStyle(svg.querySelector('#farWorld')).opacity),
    };
  })()`);
  record('I3', 'Skip intro finishes immediately and remembers the visit',
    skipped.skipGone && skipped.transform === 'none' && skipped.stored === '1' && skipped.farOpacity > 0.9,
    JSON.stringify(skipped));

  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'remount', 20000);
  await sleep(350);
  const second = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    return {
      skipGone: !document.querySelector('.home-intro-skip'),
      transform: getComputedStyle(svg).transform,
      farOpacity: Number(getComputedStyle(svg.querySelector('#farWorld')).opacity),
    };
  })()`);
  record('I4', 'second visit does not replay the intro', second.skipGone && second.transform === 'none', JSON.stringify(second));

  /* ------------------------------- 1b. the three Phase 01.5 page upgrades */
  const visit = async (pathname) => {
    await page.send('Page.navigate', { url: BASE + pathname });
    await waitFor("document.querySelector('main')", `main on ${pathname}`, 20000);
    await sleep(450);
  };

  await visit('/about');
  const aboutRow = await page.evaluate(
    "(() => { const row = [...document.querySelectorAll('.about__link')].find((r) => r.querySelector('.about__link-label')?.textContent === 'GitHub');" +
    "  const value = row?.querySelector('.about__link-value'); const chip = row?.querySelector('.chip');" +
    "  const lh = value ? parseFloat(getComputedStyle(value).lineHeight) || 20 : 0;" +
    "  return { text: value?.textContent, lines: value ? Math.round(value.getBoundingClientRect().height / lh) : 0," +
    "           chipAligned: !!(chip && row && Math.abs(chip.getBoundingClientRect().top - row.querySelector('.about__link-label').getBoundingClientRect().top) < 14) }; })()"
  );
  record('P1', 'About: social row is aligned and the handle does not wrap',
    aboutRow.lines === 1 && aboutRow.chipAligned && aboutRow.text === 'jhon-wickyyy', JSON.stringify(aboutRow));

  await visit('/architecture');
  const arch = await page.evaluate(
    "(() => ({ items: document.querySelectorAll('.arch__item').length," +
    "           plate: !!document.querySelector('.arch__plate-button')," +
    "           mark: !!document.querySelector('.arch__plate-mark') }))()"
  );
  record('P2', 'Architecture: large plate + independent index survive the merge',
    arch.plate && arch.items === 3 && arch.mark, JSON.stringify(arch));

  await visit('/travel');
  const travel = await page.evaluate(
    "(() => ({ hero: !!document.querySelector('[data-testid=\"video-hero-pending\"]')," +
    "           video: !!document.querySelector('video') }))()"
  );
  record('P3', 'Travel: VideoHero placeholder survives the merge', travel.hero && !travel.video, JSON.stringify(travel));

  /* back to the world for the transition checks */
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'world remount', 20000);
  await sleep(600);
  await page.click('#world-mechanism-about');
  await waitFor("Number(getComputedStyle(document.querySelector('#world-bridge-about')).opacity) > 0.95", 'bridge settle', 5000);
  await sleep(150);

  await page.click('#world-portal-about');
  /* grab the frame while the iris is still closing, before any evaluate round-trip */
  await sleep(260);
  await shot(page, 'p02-02-transition-covering');
  const sawCovering = await waitFor("document.querySelector('.scene-transition')?.getAttribute('data-state') === 'covering'", 'covering', 12000);
  const covering = await transitionState();
  record('T1', 'entering the About portal runs the iris transition from the portal origin',
    sawCovering && covering.state === 'covering' && covering.hidden === 'false' && covering.originX !== '',
    JSON.stringify(covering));
  record('T2', 'transition carries the destination label', !!covering.label && covering.label.length > 0, covering.label);

  const navigated = await waitFor("location.pathname === '/about'", 'route swap', 15000);
  await waitFor("document.querySelector('.scene-transition')?.getAttribute('data-state') === 'revealing'", 'revealing', 8000);
  await shot(page, 'p02-02b-transition-revealing');
  const afterNav = await transitionState();
  record('T3', 'route swaps while covered, then the layer releases',
    navigated && (afterNav.state === 'revealing' || afterNav.hidden === 'true'),
    JSON.stringify(afterNav));
  await waitFor("document.querySelector('.scene-transition')?.getAttribute('aria-hidden') === 'true'", 'reveal done', 12000);
  await shot(page, 'p02-03-about-after-transition');
  record('T4', 'overlay ends hidden and the About page is usable',
    await page.evaluate("document.querySelector('.scene-transition').getAttribute('aria-hidden') === 'true' && !!document.querySelector('h1')"),
    await page.evaluate('document.querySelector("h1").textContent'));

  /* ----------------------------------- 3. far portal transition at 390x844 */
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'mobile mount', 20000);
  await sleep(700);

  const farTarget = await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('[data-camera-target]')].find((x) => x.getAttribute('data-camera-target') === 'research');
    if (!b) return null;
    b.click();
    return b.getAttribute('data-camera-target');
  })()`);
  await sleep(1300);
  const portalHit = await page.click('#world-portal-research');
  await sleep(240);
  await shot(page, 'p02-04-mobile-covering');
  const mobileCover = await waitFor("document.querySelector('.scene-transition')?.getAttribute('data-state') === 'covering'", 'mobile covering', 12000);
  const mobileState = await transitionState();
  record('M1', 'a far portal transitions on mobile too',
    !!farTarget && portalHit.topWithin && mobileCover && mobileState.state === 'covering',
    JSON.stringify({ farTarget, hit: portalHit.topWithin, state: mobileState.state }));
  const mobileNav = await waitFor("location.pathname === '/research'", 'mobile route swap', 15000);
  record('M2', 'mobile route swaps to the research world', mobileNav, await page.evaluate('location.pathname'));
  await waitFor("document.querySelector('.scene-transition')?.getAttribute('aria-hidden') === 'true'", 'mobile reveal', 12000);
  await shot(page, 'p02-05-mobile-research');

  /* -------------------------------------------- 4. prefers-reduced-motion */
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await clearIntroAndReload();
  const reducedIntro = await page.evaluate(`(() => {
    const svg = document.querySelector('#world-home');
    return {
      skip: !!document.querySelector('.home-intro-skip'),
      transform: getComputedStyle(svg).transform,
      farOpacity: Number(getComputedStyle(svg.querySelector('#farWorld')).opacity),
    };
  })()`);
  record('R1', 'reduced motion skips the intro entirely',
    !reducedIntro.skip && reducedIntro.transform === 'none' && reducedIntro.farOpacity > 0.9,
    JSON.stringify(reducedIntro));

  await sleep(600);
  /* Seed the solved state instead of clicking the mechanism, so this check
     measures the transition policy, not click plumbing. */
  await page.evaluate(
    "localStorage.setItem('personal-world:home:v2', JSON.stringify({ version: 2, puzzles: { 'world-puzzle-about': true }, updatedAt: Date.now() }))"
  );
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'reduced seeded mount', 20000);
  await sleep(700);
  const seeded = await page.evaluate(
    "document.querySelector('#world-bridge-about').classList.contains('is-open')"
  );
  await page.click('#world-portal-about');
  const instant = await waitFor("location.pathname === '/about'", 'reduced route swap', 8000);
  const overlayAfter = await transitionState();
  record('R2', 'reduced motion navigates without the spatial transition',
    seeded && instant && (overlayAfter.hidden === 'true' || overlayAfter.display === 'none'),
    JSON.stringify({ seeded, instant, overlay: overlayAfter }));
  await shot(page, 'p02-06-reduced-motion-about');

  /* and mechanisms must still respond with motion switched off */
  await page.send('Page.navigate', { url: BASE + '/' });
  await waitFor("document.querySelector('#world-home')", 'reduced toggle mount', 20000);
  await sleep(700);
  await page.evaluate(
    "localStorage.removeItem('personal-world:home:v2'); location.reload()"
  );
  await waitFor("document.querySelector('#world-home')", 'reduced clean mount', 20000);
  await sleep(800);
  const toggleHit = await page.click('#world-mechanism-instagram');
  await sleep(500);
  const toggled = await page.evaluate(
    "document.querySelector('#world-bridge-instagram').classList.contains('is-open')"
  );
  record('R3', 'reduced motion keeps mechanism activation working', toggleHit.topWithin && toggled === true,
    JSON.stringify({ hit: toggleHit.topWithin, toggled }));

  record('E1', 'no console errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(56)}`);
  console.log(`phase 02 acceptance: ${results.length - failed.length}/${results.length} passed${failed.length ? `  |  ${failed.length} FAILED` : '  |  all green'}`);
  process.exitCode = failed.length ? 1 : 0;
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(250);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
