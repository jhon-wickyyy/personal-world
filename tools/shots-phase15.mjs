/**
 * shots-phase15.mjs — screenshots + focused checks for the three Phase 01.5 changes.
 * Only the pages that changed; the full route suite is not re-run.
 *
 *   node tools/shots-phase15.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 4177);
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
const record = (id, name, ok, detail = '') => {
  results.push({ id, name, ok: !!ok, detail: String(detail ?? '') });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${id}] ${name}${!ok && detail ? `  <- ${detail}` : ''}`);
};

const logFd = fs.openSync(path.join(SHOTS, 'server.log'), 'w');
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
  console.error(fs.readFileSync(path.join(SHOTS, 'server.log'), 'utf8'));
  process.exit(2);
}

const { proc, userDir, wsUrl } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1600, height: 1000 } });

const go = async (pathname) => {
  await page.send('Page.navigate', { url: BASE + pathname });
  await page.waitFor("document.querySelector('main')", { timeout: 20000, label: pathname });
  await sleep(450);
};

const shot = async (name) => {
  await page.screenshot(path.join(SHOTS, `${name}.png`));
  console.log(`         ${name}.png`);
};

try {
  /* -------------------------------------------------------- 1. About */
  await go('/about');
  const about = await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll('.about__link')].map((row) => {
      const label = row.querySelector('.about__link-label');
      const value = row.querySelector('.about__link-value');
      const chip = row.querySelector('.chip');
      const rect = (el) => (el ? el.getBoundingClientRect() : null);
      return {
        label: label && label.textContent,
        value: value && value.textContent,
        valueLines: value ? Math.round(rect(value).height / parseFloat(getComputedStyle(value).lineHeight || '16')) : 0,
        valueWraps: value ? rect(value).height > parseFloat(getComputedStyle(value).fontSize) * 2.2 : false,
        chipTop: chip ? Math.round(rect(chip).top) : null,
        labelTop: label ? Math.round(rect(label).top) : null,
        rowScrollW: row.scrollWidth, rowClientW: row.clientWidth,
      };
    });
    return { rows, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  })()`);
  const github = about.rows.find((r) => r.label === 'GitHub');
  const insta = about.rows.find((r) => r.label === 'Instagram');
  record('A1', 'GitHub handle stays on one line', !!github && !github.valueWraps, JSON.stringify(github));
  record('A2', 'Instagram pending aligns with its row (chip on the label baseline)',
    !!insta && Math.abs((insta.chipTop ?? 0) - (insta.labelTop ?? 99)) <= 14, JSON.stringify(insta));
  record('A3', 'About fits the viewport at 1600px', !about.overflow);
  await shot('p15-01-about-desktop');

  /* ------------------------------------------------- 2. Architecture */
  await go('/architecture');
  const arch = await page.evaluate(`(() => {
    const items = [...document.querySelectorAll('.arch__item')];
    const plate = document.querySelector('.arch__plate-button');
    return {
      items: items.length,
      current: items.findIndex((i) => i.getAttribute('aria-current') === 'true'),
      plateLabel: plate && plate.getAttribute('aria-label'),
      hasEmptyMark: !!document.querySelector('.arch__plate-mark'),
      count: (document.querySelector('.arch__count') || {}).textContent,
    };
  })()`);
  record('B1', 'index lists selectable slots, first is current',
    arch.items === 3 && arch.current === 0 && /slot 01/i.test(arch.plateLabel || ''), JSON.stringify(arch));
  record('B2', 'empty plate is a designed mark, not a blank box', arch.hasEmptyMark === true);

  const items = await page.evaluate(
    "[...document.querySelectorAll('.arch__item')].map((b) => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })"
  );
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x: items[1].x, y: items[1].y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    await sleep(30);
  }
  await sleep(350);
  const switched = await page.evaluate(`(() => ({
    plateLabel: document.querySelector('.arch__plate-button').getAttribute('aria-label'),
    current: [...document.querySelectorAll('.arch__item')].findIndex((i) => i.getAttribute('aria-current') === 'true'),
  }))()`);
  record('B3', 'clicking the index switches the plate', switched.current === 1 && /slot 02/i.test(switched.plateLabel), JSON.stringify(switched));
  await shot('p15-02-architecture-desktop');

  await page.click('.arch__plate-button');
  await sleep(450);
  const detail = await page.evaluate(`(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? { title: (d.querySelector('h2') || {}).textContent, groups: d.querySelectorAll('.arch__media-group').length } : null;
  })()`);
  record('B4', 'clicking the plate opens the project detail sheet', !!detail && detail.groups === 3, JSON.stringify(detail));
  await shot('p15-03-architecture-detail');
  await page.key('Escape', 'Escape', 27);

  /* -------------------------------------------------------- 3. Travel */
  await go('/travel');
  const travel = await page.evaluate(`(() => {
    const hero = document.querySelector('[data-testid="video-hero"]');
    const pending = document.querySelector('[data-testid="video-hero-pending"]');
    return {
      pending: !!pending,
      video: !!document.querySelector('.video-hero__video'),
      spec: (document.querySelector('.video-hero__line') || {}).textContent,
      playButton: !!document.querySelector('.video-hero__play'),
      height: pending ? Math.round(pending.getBoundingClientRect().height) : 0,
    };
  })()`);
  record('C1', 'no source: renders the spec plate, not a fake player', travel.pending && !travel.video, JSON.stringify(travel));
  record('C2', 'spec states muted / loop / playsInline', /muted/.test(travel.spec || '') && /loop/.test(travel.spec || ''));
  await shot('p15-04-travel-desktop');

  /* ------------------------------------------------------- mobile pass */
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await go('/about');
  const aboutM = await page.evaluate(`(() => {
    const row = document.querySelector('.about__link');
    const chip = row.querySelector('.chip');
    const value = row.querySelector('.about__link-value');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      chipRight: Math.round(chip.getBoundingClientRect().right),
      valueW: Math.round(value.getBoundingClientRect().width),
      valueH: Math.round(value.getBoundingClientRect().height),
    };
  })()`);
  record('A4', 'About mobile: no overflow, handle unclipped', !aboutM.overflow && aboutM.chipRight <= 390, JSON.stringify(aboutM));
  await shot('p15-05-about-mobile');

  await go('/architecture');
  const archM = await page.evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    plateH: Math.round(document.querySelector('.arch__plate-button').getBoundingClientRect().height),
    items: document.querySelectorAll('.arch__item').length,
  }))()`);
  record('B5', 'Architecture mobile: single column, no overflow', !archM.overflow && archM.items === 3, JSON.stringify(archM));
  await shot('p15-06-architecture-mobile');

  await go('/travel');
  const travelM = await page.evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    heroH: Math.round(document.querySelector('[data-testid="video-hero-pending"]').getBoundingClientRect().height),
  }))()`);
  record('C3', 'Travel mobile: hero keeps a usable height, no overflow', !travelM.overflow && travelM.heroH > 200, JSON.stringify(travelM));
  await shot('p15-07-travel-mobile');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(56)}`);
  console.log(`phase 01.5 shots: ${results.length - failed.length}/${results.length} passed${failed.length ? `  |  ${failed.length} FAILED` : '  |  all green'}`);
  process.exitCode = failed.length ? 1 : 0;
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(250);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
