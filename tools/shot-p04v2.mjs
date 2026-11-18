import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 120; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await sleep(150); }
const { proc, userDir, wsUrl } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1440, height: 900 } });

const go = async (p, name, wait = 900) => {
  await page.send('Page.navigate', { url: BASE + p });
  await page.waitFor("document.querySelector('main')", { timeout: 20000 });
  await page.waitFor("Array.from(document.images).every((i) => i.complete)", { timeout: 20000 }).catch(() => {});
  await sleep(wait);
  if (name) await page.screenshot(path.join(SHOTS, name + '.png'));
  return page.evaluate(`(() => ({ title: document.title, h1: (document.querySelector('h1')||{}).textContent, imgs: document.images.length }))()`);
};

try {
  console.log('/architecture    ', JSON.stringify(await go('/architecture', 'p04v2-architecture')));
  // open the first project through the plate (a real click on the hero)
  await page.click('.arch__plate-button');
  await page.waitFor("location.pathname.startsWith('/architecture/')", { timeout: 10000 }).catch(() => {});
  await sleep(1200);
  const project = await page.evaluate(`(() => ({ path: location.pathname, title: document.title, h1: (document.querySelector('h1')||{}).textContent }))()`);
  console.log('project page     ', JSON.stringify(project));
  await page.screenshot(path.join(SHOTS, 'p04v2-project.png'));

  // lightbox: the first thumb sits below the fold, so scroll it in first
  await page.evaluate("document.querySelector('.project__thumb').scrollIntoView({ block: 'center' })");
  await sleep(400);
  await page.click('.project__thumb');
  await sleep(600);
  const lb = await page.evaluate("!!document.querySelector('[data-testid=\"lightbox\"]')");
  await page.screenshot(path.join(SHOTS, 'p04v2-lightbox.png'));
  console.log('lightbox opened  ', lb);
  await page.key('Escape', 'Escape', 27);

  for (const [p, n] of [['/travel', 'p04v2-travel'], ['/research', 'p04v2-research']]) {
    console.log(p.padEnd(18), JSON.stringify(await go(p, n)));
  }
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
