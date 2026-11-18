/**
 * jsdom polyfills for the Home World runtime.
 *
 * jsdom has no layout engine, so getBoundingClientRect() is all zeros; the
 * runtime tolerates that. What it cannot tolerate is the absence of the APIs
 * below, which browsers always provide.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });
}

if (!('PointerEvent' in window)) {
  class PointerEventStub extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }
  Object.defineProperty(window, 'PointerEvent', { writable: true, value: PointerEventStub });
}

for (const method of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const) {
  if (!(method in Element.prototype)) {
    Object.defineProperty(Element.prototype, method, { writable: true, value: () => false });
  }
}

if (!Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { writable: true, value: () => {} });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
