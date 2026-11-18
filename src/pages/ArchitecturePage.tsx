import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { worldById } from '../content/worlds';
import type { ProjectEntry } from '../content/types';
import { ContentPending, Field, MediaFrame } from '../components/ui';
import type { MediaItem } from '../components/ui';
import { metaTitle, useDocumentMeta } from '../app/useDocumentMeta';
import './page.css';

/**
 * Architecture — editorial portfolio: one large plate, one independent project
 * index beside it. Clicking the plate opens the project's own shareable page
 * (/architecture/:projectId); selecting an index entry swaps the plate.
 *
 * With no content supplied the page still demonstrates the mechanism honestly:
 * the index lists three PLATE SLOTS (not invented buildings).
 */

interface Plate {
  id: string;
  label: string;
  role: string;
  project: ProjectEntry | null;
}

const SLOT_ROLES = ['Hero render', 'Model study', 'Plan / section'] as const;

function buildPlates(projects: ProjectEntry[]): Plate[] {
  if (projects.length > 0) {
    return projects.map((project, i) => ({
      id: project.id,
      label: project.title.value ?? `Project ${String(i + 1).padStart(2, '0')}`,
      role: project.media?.renders?.length ? 'Hero render' : 'Cover',
      project,
    }));
  }
  return SLOT_ROLES.map((role, i) => ({
    id: `slot-${i + 1}`,
    label: `Slot ${String(i + 1).padStart(2, '0')}`,
    role,
    project: null,
  }));
}

export function ArchitecturePage({ projects }: { projects?: ProjectEntry[] }) {
  const world = worldById('architecture');
  const navigate = useNavigate();
  const list = projects ?? world.projects;
  const plates = useMemo(() => buildPlates(list), [list]);
  const [selected, setSelected] = useState(0);

  useDocumentMeta({
    title: metaTitle('Architecture'),
    description: 'Architecture projects — axonometric plates, renders, analysis and drawings.',
    image: '/og-image.jpg',
  });

  if (!world) return <Navigate to="/" replace />;

  const active = plates[Math.min(selected, plates.length - 1)];
  const cover = active.project?.cover.value ?? null;
  const heroItem: MediaItem | null = cover
    ? { kind: 'image', src: cover, caption: active.project?.title.value ?? undefined }
    : (active.project?.media?.renders?.[0] ?? null);

  const open = () => {
    if (active.project) navigate(`/architecture/${active.project.id}`);
  };

  return (
    <main className="page__main arch" data-world="architecture" id="main">
      <div className="page__inner">
        <header className="arch__head">
          <p className="eyebrow">{world.label}</p>
          <h1 className="arch__title display">{world.label}</h1>
          <div className="arch__tagline">
            <Field field={world.tagline} label="Architecture tagline" compact />
          </div>
        </header>

        <div className="arch__layout">
          <section className="arch__plate" aria-label="Selected project plate">
            {active.project ? (
              <button
                type="button"
                className="arch__plate-button"
                onClick={open}
                aria-label={`Open ${active.label} project page`}
              >
                {heroItem ? (
                  <MediaFrame item={heroItem} index={0} ratio="16 / 10" label={active.label} priority />
                ) : (
                  <div className="arch__plate-empty" style={{ aspectRatio: '16 / 10' }}>
                    <span className="arch__plate-role">{active.role}</span>
                    <span className="arch__plate-mark" aria-hidden="true" />
                    <span className="arch__plate-hint">open the project page</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="arch__plate-empty" style={{ aspectRatio: '16 / 10' }}>
                <span className="arch__plate-role">{active.role}</span>
                <span className="arch__plate-mark" aria-hidden="true" />
                <span className="arch__plate-hint">no project supplied yet</span>
              </div>
            )}
            <div className="arch__plate-foot">
              <span className="arch__plate-name">{active.label}</span>
              <span className="arch__plate-open">{active.project ? 'open project' : 'pending'}</span>
            </div>
          </section>

          <aside className="arch__index" aria-label="Project index">
            <div className="arch__index-head">
              <h2 className="eyebrow">Projects</h2>
              <span className="arch__count">{list.length} supplied</span>
            </div>
            <ol className="arch__list">
              {plates.map((plate, i) => (
                <li key={plate.id}>
                  <button
                    type="button"
                    className={`arch__item ${i === selected ? 'is-current' : ''}`}
                    aria-current={i === selected ? 'true' : undefined}
                    onClick={() => setSelected(i)}
                    onDoubleClick={() => plate.project && navigate(`/architecture/${plate.project.id}`)}
                  >
                    <span className="arch__item-no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="arch__item-label">{plate.label}</span>
                    <span className="arch__item-role">{plate.role}</span>
                  </button>
                </li>
              ))}
            </ol>
            {list.length === 0 ? (
              <ContentPending
                label="Architecture projects"
                source="project folders / renders / drawings"
                compact
              />
            ) : null}
          </aside>
        </div>

        <section className="arch__intro" aria-labelledby="arch-intro">
          <h2 className="eyebrow" id="arch-intro">Introduction</h2>
          <Field field={world.intro} label="Architecture introduction" />
        </section>
      </div>
    </main>
  );
}
