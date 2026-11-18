/**
 * cdp.mjs  -  minimal Chrome DevTools Protocol driver (no npm dependencies).
 *
 * Extracted so every acceptance script shares one implementation. Real pointer
 * events, real viewport emulation, real screenshots.
 *
 * Sandbox note: children are spawned with stdio:'ignore' because piped stdio is
 * rejected on this platform (spawn EPERM). Readiness is detected by polling the
 * CDP endpoint.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

export class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.sessions = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data || '')})`));
        else resolve(msg.result);
      } else if (msg.method) {
        this.sessions.get(msg.sessionId)?.events.push(msg);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 45000);
    });
  }
}

export class Page {
  constructor(cdp, sessionId) {
    this.cdp = cdp;
    this.sid = sessionId;
    this.events = [];
    cdp.sessions.set(sessionId, this);
    this.onEvent = null;
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sid);
  }

  async evaluate(expression, { awaitPromise = true, timeout = 25000 } = {}) {
    const res = await this.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true, timeout, userGesture: true,
    });
    if (res.exceptionDetails) {
      const d = res.exceptionDetails;
      throw new Error(d.exception?.description || d.text || 'evaluate failed');
    }
    return res.result.value;
  }

  async waitFor(expression, { timeout = 12000, label = expression } = {}) {
    const t0 = Date.now();
    let lastErr = null;
    while (Date.now() - t0 < timeout) {
      try {
        const ok = await this.evaluate(`(()=>{try{return !!(${expression})}catch(e){return false}})()`, { awaitPromise: false });
        if (ok) return true;
      } catch (e) { lastErr = e; }
      await sleep(60);
    }
    throw new Error(`waitFor timed out: ${label}${lastErr ? ` (${lastErr.message})` : ''}`);
  }

  async click(selector, { index = 0 } = {}) {
    const hit = await this.evaluate(`(() => {
      const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!el) return { error: 'no element' };
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        x, y, w: Math.round(r.width), h: Math.round(r.height),
        left: Math.round(r.left), top: Math.round(r.top),
        topTag: top ? top.tagName : null,
        topClass: top ? (top.getAttribute('class') || '') : null,
        topId: top ? (top.id || '') : null,
        topWithin: top ? !!top.closest(${JSON.stringify(selector)}) : false,
      };
    })()`);
    if (hit.error) throw new Error(`${selector}: ${hit.error}`);
    /* clickCount must be 1 on BOTH press and release, otherwise Chromium emits
       pointerdown/mousedown/pointerup/mouseup but never a `click`. That stings:
       the page looks dead while every handler is fine. */
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', {
        type, x: hit.x, y: hit.y, button: 'left',
        buttons: type === 'mousePressed' ? 1 : 0,
        clickCount: type === 'mouseMoved' ? 0 : 1,
      });
      await sleep(16);
    }
    return hit;
  }

  async key(name, code, keyCode) {
    for (const type of ['keyDown', 'keyUp']) {
      await this.send('Input.dispatchKeyEvent', {
        type, key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode,
        text: type === 'keyDown' && name.length === 1 ? name : undefined,
      });
      await sleep(24);
    }
  }

  async screenshot(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const r = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  }
}

export async function launchChrome({ port = 9333, headed = false, width = 1600, height = 1000 } = {}) {
  const bin = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!bin) throw new Error('No Chrome/Edge binary found.');
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-chrome-'));
  const args = [
    headed ? '--headless=old' : '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    '--no-first-run', '--no-default-browser-check', '--no-sandbox',
    '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${width},${height}`,
    '--allow-file-access-from-files',
    'about:blank',
  ];
  const proc = spawn(bin, args, { stdio: 'ignore' });
  let info = null;
  for (let i = 0; i < 160; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) { info = await res.json(); break; }
    } catch { /* not up yet */ }
    await sleep(150);
  }
  if (!info) throw new Error(`Chrome did not expose CDP on ${port} (binary: ${bin}).`);
  return { bin, proc, userDir, wsUrl: info.webSocketDebuggerUrl, version: info.Browser };
}

export async function openPage(browser, { viewport } = {}) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new Page(browser, sessionId);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  if (viewport) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height,
      deviceScaleFactor: viewport.dpr || 1, mobile: !!viewport.mobile,
      ...(viewport.mobile ? { screenOrientation: { type: 'portraitPrimary', angle: 0 } } : {}),
    });
  }
  return page;
}

export async function startServer({ port = 4173, root = ROOT } = {}) {
  if (process.env.SKIP_SERVER) return null;
  const proc = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs')], {
    stdio: 'ignore',
    env: { ...process.env, PORT: String(port) },
  });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return proc;
    } catch { /* starting */ }
    await sleep(120);
  }
  proc.kill();
  throw new Error(`server failed to start on ${url}`);
}
