/**
 * Content contract.
 *
 * Every human-authored string on this site goes through one of these types, and
 * anything the owner has not supplied yet carries `status: 'CONTENT_PENDING'`
 * with a `null` value. Pages render a visible placeholder instead of inventing
 * biography, project copy or links.
 */

export type ContentStatus = 'READY' | 'CONTENT_PENDING';

export interface ContentField<T> {
  status: ContentStatus;
  /** null whenever status is CONTENT_PENDING  -  never a placeholder string */
  value: T | null;
  /** where the owner will supply it from, shown in the pending placeholder */
  source?: string;
}

export type WorldId = 'architecture' | 'travel' | 'research';
export type SocialId = 'github' | 'instagram';

export interface NavItem {
  label: string;
  to: string;
  /** true for the four work worlds, so the nav can group them */
  world?: WorldId;
}

export interface SocialEntry {
  id: SocialId;
  label: string;
  status: ContentStatus;
  url: string | null;
  handle: string | null;
}

/**
 * Media attached to a project, grouped the way an architecture portfolio is
 * actually browsed: renders, model shots, and plan/elevation/section drawings.
 * Every group is optional and empty until the owner supplies the files.
 */
export interface ProjectDocument {
  src: string;
  label: string;
}

export interface ProjectMedia {
  renders?: import('../components/ui').MediaItem[];
  models?: import('../components/ui').MediaItem[];
  drawings?: import('../components/ui').MediaItem[];
  /** simulation / site analysis diagrams */
  analysis?: import('../components/ui').MediaItem[];
}

export interface ProjectEntry {
  id: string;
  title: ContentField<string>;
  year: ContentField<string>;
  summary: ContentField<string>;
  cover: ContentField<string>;
  gallery: ContentField<string[]>;
  /** optional multi-group media for portfolio-style pages */
  media?: ProjectMedia;
  /** downloadable pdfs (plans, reports) */
  documents?: ProjectDocument[];
}

/** A work world page: its own layout, its own palette accent. */
export interface WorldEntry {
  id: WorldId;
  label: string;
  path: string;
  accent: 'red' | 'blue' | 'green' | 'lilac';
  tagline: ContentField<string>;
  intro: ContentField<string>;
  projects: ProjectEntry[];
  /** world-level media (photos, poster) shown as a gallery */
  gallery?: import('../components/ui').MediaItem[];
  /** optional still hero, used when a video is not supplied */
  hero?: import('../components/ui').MediaItem;
  /** world-level documents (reports) shown as links */
  documents?: ProjectDocument[];
}

export const isReady = <T,>(field: ContentField<T>): field is ContentField<T> & { value: T } =>
  field.status === 'READY' && field.value !== null;

export const pending = <T,>(source?: string): ContentField<T> => ({
  status: 'CONTENT_PENDING',
  value: null,
  source,
});

export const ready = <T,>(value: T): ContentField<T> => ({ status: 'READY', value });
