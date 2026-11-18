import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Cdp, launchChrome, openPage, sleep } from './lib/cdp.mjs';
const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 4184;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 120; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await sleep(150); }
const { proc, userDir, wsUrl } = await launchChrome();
const cdp = await Cdp.connect(wsUrl);
const page = await openPage(cdp, { viewport: { width: 1440, height: 900 } });
try {
  await page.send('Page.navigate', { url: BASE + '/architecture/alumni-hall' });
  await page.waitFor("document.querySelector('main')", { timeout: 20000 });
  await page.waitFor("Array.from(document.images).every((i) => i.complete)", { timeout: 20000 }).catch(() => {});
  await sleep(900);
  const info = await page.evaluate(`(() => {
    const t = document.querySelectorAll('.project__thumb');
    const first = t[0];
    const r = first ? first.getBoundingClientRect() : null;
    const top = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return { thumbs: t.length, rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
             top: top ? top.tagName + '.' + (top.getAttribute('class') || '') : null,
             inThumb: top ? !!top.closest('.project__thumb') : false,
             scrollY: window.scrollY, vh: innerHeight };
  })()`);
  console.log('diag', JSON.stringify(info));
  const hit = await page.click('.project__thumb');
  await sleep(500);
  console.log('after real click:', JSON.stringify(hit), 'lightbox:', await page.evaluate("!!document.querySelector('[data-testid=\"lightbox\"]')"));
  await page.evaluate("document.querySelector('.project__thumb').click()");
  await sleep(500);
  console.log('after js click:', await page.evaluate("!!document.querySelector('[data-testid=\"lightbox\"]')"));
} finally {
  try { await cdp.send('Browser.close'); } catch {}
  try { proc.kill(); } catch {}
  try { server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
