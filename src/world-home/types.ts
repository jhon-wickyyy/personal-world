/**
 * Type surface for the frozen Home World module.
 *
 * The module itself is plain JS/JSX (verified by its own CI, never type-checked
 * here). The site owns this thin typed seam instead of editing the module.
 */

import type { ComponentType, Ref } from 'react';

export interface HomeWorldHandle {
  getState(): Record<string, boolean>;
  getCurrentNode(): string | null;
  getCurrentRoute(): string | null;
  isWalking(): boolean;
  enterPortal(key: string): Promise<boolean> | boolean;
  returnHome(): Promise<void> | void;
  togglePuzzle(id: string): void;
  reset(): void;
  setCamera(key: string): Promise<void> | void;
  announce(message: string): void;
  destroy(): void;
}

export interface PortalActivateDetail {
  key: string;
  route: { label: string };
  portal: Element;
}

export interface PathBlockedDetail {
  key: string;
  missingPuzzles?: string[];
  reachedNode?: string;
}

export interface PuzzleStateDetail {
  puzzleId: string;
  solved: boolean;
}

export interface HomeWorldProps {
  /** HOME_WORLD.svg markup, imported with ?raw  -  must stay inline */
  svgMarkup: string;
  className?: string;
  hostClassName?: string;
  enableGsap?: boolean;
  forwardRef?: Ref<HomeWorldHandle>;
  runtimeOptions?: Record<string, unknown>;
  onReady?: (context: { runtime: unknown; motion: unknown; svg: Element }) => void;
  onPortalActivate?: (detail: PortalActivateDetail) => void;
  onPathBlocked?: (detail: PathBlockedDetail) => void;
  onPuzzleStateChange?: (detail: PuzzleStateDetail) => void;
}

export type HomeWorldComponent = ComponentType<HomeWorldProps>;
