import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = 4182;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 120; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await sleep(150); }
const { proc, userDir, wsUrl } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1440, height: 900 } });

const go = async (p, name) => {
  await page.send('Page.navigate', { url: BASE + p });
  await page.waitFor("document.querySelector('main')", { timeout: 20000 });
  await page.waitFor("Array.from(document.images).every((i) => i.complete)", { timeout: 20000 }).catch(() => {});
  await sleep(900);
  await page.screenshot(path.join(SHOTS, name + '.png'));
  const stat = await page.evaluate(`(() => ({
    imgs: document.images.length,
    broken: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length,
    h1: (document.querySelector('h1') || {}).textContent,
  }))()`);
  console.log(name, JSON.stringify(stat));
};

try {
  await go('/architecture', 'content-architecture');
  await page.click('.arch__item:nth-child(1)').catch(() => {});
  await sleep(300);
  await page.click('.arch__plate-button');
  await sleep(700);
  await page.screenshot(path.join(SHOTS, 'content-architecture-detail.png'));
  console.log('detail captured');
  await go('/travel', 'content-travel');
  await go('/research', 'content-research');
  await go('/about', 'content-about');
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
