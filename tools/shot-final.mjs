import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';
const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = 4185;
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
  await sleep(800);
  await page.screenshot(path.join(SHOTS, name + '.png'), { captureBeyondViewport: true });
  return page.evaluate(`(() => ({ title: document.title, pending: document.querySelectorAll('.pending').length }))()`);
};
try {
  console.log('/about   ', JSON.stringify(await go('/about', 'final-about')));
  console.log('/research', JSON.stringify(await go('/research', 'final-research')));
  console.log('/architecture', JSON.stringify(await go('/architecture', 'final-architecture')));
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
