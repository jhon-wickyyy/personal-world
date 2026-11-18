import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FILL, PALETTE } from '../../world/src/styles/palette.mjs';

/**
 * The site design system and the Home World palette must not drift: the world
 * renders with its own --world-* tokens, so the shell's anchors have to be the
 * same colours or the seam between them becomes visible.
 */

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const readToken = (name: string): string => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --${name} not found in tokens.css`);
  return match[1].toUpperCase();
};

describe('design tokens', () => {
  it('defines the six brand anchors from the brief', () => {
    expect(readToken('color-red')).toBe('#B98587');
    expect(readToken('color-blue')).toBe('#879EAD');
    expect(readToken('color-green')).toBe('#899B88');
    expect(readToken('color-bg')).toBe('#E9E5DE');
    expect(readToken('color-text')).toBe('#625D59');
    expect(readToken('color-lilac')).toBe('#B5A9B5');
  });

  it('matches the Home World palette on every colour the world renders', () => {
    expect(readToken('color-red')).toBe(PALETTE['morandi-red'].toUpperCase());
    expect(readToken('color-blue')).toBe(PALETTE['morandi-blue'].toUpperCase());
    expect(readToken('color-green')).toBe(PALETTE['morandi-green'].toUpperCase());
    expect(readToken('color-bg')).toBe(PALETTE['world-bg'].toUpperCase());
    expect(readToken('color-text')).toBe(PALETTE['world-text'].toUpperCase());

    /* the world's own surfaces must be derived from the same anchors */
    expect(FILL.portalFrame.toUpperCase()).toBe(PALETTE['morandi-red'].toUpperCase());
    expect(FILL.mechanismBase.toUpperCase()).toBe(PALETTE['morandi-green'].toUpperCase());
    expect(FILL.character.toUpperCase()).toBe(PALETTE['world-text'].toUpperCase());
  });

  it('documents the four responsive breakpoints', () => {
    const breakpoints = css.match(/^\s*(sm|md|lg|xl)\s+\d+px/gm) ?? [];
    expect(breakpoints.map((line: string) => line.trim().split(/\s+/)[0])).toEqual(['sm', 'md', 'lg', 'xl']);
  });

  it('exposes the scale, spacing and shape primitives the components use', () => {
    for (const token of [
      '--text-xs',
      '--text-4xl',
      '--space-1',
      '--space-10',
      '--page-gutter',
      '--radius-pill',
      '--shadow-modal',
      '--ease-out',
    ]) {
      expect(css).toContain(`${token}:`);
    }
  });
});
