/**
 * Per-route document metadata. Keeps the tab title, description and the
 * OpenGraph/Twitter tags in sync with the page being viewed, without adding a
 * head-management dependency.
 */

import { useEffect } from 'react';

export interface DocumentMeta {
  title: string;
  description?: string;
  /** absolute or root-relative image used for link previews */
  image?: string;
  type?: 'website' | 'article';
}

const SITE = 'Personal World';

const setTag = (selector: string, attrs: Record<string, string>, create: () => HTMLElement) => {
  let node = document.head.querySelector(selector) as HTMLElement | null;
  if (!node) {
    node = create();
    document.head.appendChild(node);
  }
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
};

export function useDocumentMeta({ title, description, image, type = 'website' }: DocumentMeta) {
  useEffect(() => {
    document.title = title;

    if (description) {
      setTag('meta[name="description"]', { name: 'description', content: description }, () => {
        const el = document.createElement('meta');
        el.setAttribute('name', 'description');
        return el;
      });
    }

    setTag('meta[property="og:title"]', { property: 'og:title', content: title }, () => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:title');
      return el;
    });
    setTag('meta[property="og:type"]', { property: 'og:type', content: type }, () => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:type');
      return el;
    });
    setTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' }, () => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'twitter:card');
      return el;
    });

    if (description) {
      setTag('meta[property="og:description"]', { property: 'og:description', content: description }, () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:description');
        return el;
      });
    }

    if (image) {
      setTag('meta[property="og:image"]', { property: 'og:image', content: image }, () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:image');
        return el;
      });
      setTag('meta[name="twitter:image"]', { name: 'twitter:image', content: image }, () => {
        const el = document.createElement('meta');
        el.setAttribute('name', 'twitter:image');
        return el;
      });
    }
  }, [title, description, image, type]);
}

export const metaTitle = (page?: string) => (page ? `${page} — ${SITE}` : SITE);
