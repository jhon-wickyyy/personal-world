import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 120; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await sleep(150); }

const { proc, userDir, wsUrl } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1440, height: 900 } });

try {
  await page.send('Page.navigate', { url: BASE + '/' });
  await page.waitFor("document.querySelector('#world-home')", { timeout: 20000 });
  await page.evaluate("localStorage.setItem('personal-world:intro-seen:v1','1'); localStorage.removeItem('personal-world:home:v2')");
  await page.send('Page.navigate', { url: BASE + '/' });
  await page.waitFor("document.querySelector('#world-home')", { timeout: 20000 });
  await sleep(900);
  await page.screenshot(path.join(SHOTS, 'home-1440-initial.png'));

  // solve the About mechanism so the bridge reads as "connected"
  await page.click('#world-mechanism-about');
  await page.waitFor("Number(getComputedStyle(document.querySelector('#world-bridge-about')).opacity) > 0.95", { timeout: 5000 }).catch(() => {});
  await sleep(250);
  await page.screenshot(path.join(SHOTS, 'home-1440-puzzle.png'));

  console.log('ok');
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
