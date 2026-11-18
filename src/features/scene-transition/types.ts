export interface TransitionPoint {
  x: number;
  y: number;
}

export type TransitionOrigin = Element | TransitionPoint | null | undefined;

/**
 * Which transition artwork runs while the screen is covered.
 * `generic` keeps the neutral geometric fold used by About, Travel and Research.
 * `architecture` runs the dedicated scene: portal glow, camera push-in,
 * isometric building unfold and grid reveal.
 */
export type TransitionScene = 'generic' | 'architecture';

export interface SceneTransitionRequest {
  /** Human-readable destination, announced to assistive technology. */
  label: string;
  /** The portal element is used as the spatial origin of the transition. */
  origin?: TransitionOrigin;
  /** Transition artwork to run; defaults to the generic fold. */
  scene?: TransitionScene;
  /** Called while the screen is fully covered, before the new route is revealed. */
  onCover: () => void;
}

export interface SceneTransitionContextValue {
  isTransitioning: boolean;
  transitionTo: (request: SceneTransitionRequest) => Promise<boolean>;
}
