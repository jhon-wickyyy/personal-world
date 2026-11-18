import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { architectureEntries } from '../content/projects';
import type { MediaItem } from '../components/ui';
import { ContentPending, Field, MediaFrame } from '../components/ui';
import { Lightbox, type LightboxState } from '../components/Lightbox';
import { metaTitle, useDocumentMeta } from '../app/useDocumentMeta';
import { worldById } from '../content/worlds';
import './page.css';

const GROUPS = [
  { key: 'renders', label: 'Renders' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'drawings', label: 'Drawings' },
] as const;

/**
 * /architecture/:projectId — a shareable project page.
 *
 * Every image can be opened full size; the documents list links the supplied
 * PDFs. Copy that the owner has not provided stays CONTENT_PENDING.
 */
export function ProjectPage() {
  const { projectId } = useParams();
  const project = useMemo(
    () => architectureEntries.find((entry) => entry.id === projectId) ?? null,
    [projectId]
  );
  const world = worldById('architecture');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useDocumentMeta({
    title: metaTitle(project ? project.title.value ?? 'Project' : 'Architecture'),
    description: project?.summary.value ?? undefined,
    image: project?.cover.value ?? undefined,
    type: 'article',
  });

  const openLightbox = useCallback((items: MediaItem[], index: number, label: string) => {
    setLightbox({ items, index, label });
  }, []);

  if (!project) return <Navigate to="/architecture" replace />;

  const groups = GROUPS.map(({ key, label }) => ({
    key,
    label,
    items: (project.media?.[key] ?? []) as MediaItem[],
  }));

  return (
    <main className="page__main project" data-project={project.id} id="main">
      <div className="page__inner">
        <nav className="project__back" aria-label="Breadcrumb">
          <Link to="/architecture" className="button button--quiet">
            ← {world.label}
          </Link>
        </nav>

        <header className="project__head">
          <p className="eyebrow">{world.label}</p>
          <h1 className="project__title display">{project.title.value}</h1>
          <div className="project__meta">
            <Field field={project.year} label="Year" compact />
          </div>
        </header>

        <figure className="project__hero">
          {project.cover.value ? (
            <button
              type="button"
              className="project__hero-button"
              onClick={() => openLightbox([{ kind: 'image', src: project.cover.value! }], 0, project.title.value ?? 'Hero')}
              aria-label="Open the hero image full size"
            >
              <MediaFrame
                item={{ kind: 'image', src: project.cover.value }}
                index={0}
                ratio="16 / 9"
                label={project.title.value ?? 'Hero'}
                priority
              />
            </button>
          ) : null}
        </figure>

        <section className="project__summary" aria-labelledby="project-summary">
          <h2 className="eyebrow" id="project-summary">About this project</h2>
          <Field field={project.summary} label="Project description" />
        </section>

        {groups.map(({ key, label, items }) => (
          <section className="project__group" key={key} aria-labelledby={`project-${key}`}>
            <div className="project__group-head">
              <h2 className="eyebrow" id={`project-${key}`}>{label}</h2>
              <span className="project__count">{items.length} images</span>
            </div>
            {items.length === 0 ? (
              <ContentPending label={`${label} for this project`} compact />
            ) : (
              <div className="project__grid">
                {items.map((item, index) => (
                  <button
                    type="button"
                    className="project__thumb"
                    key={item.src}
                    onClick={() => openLightbox(items, index, label)}
                    aria-label={`Open ${label} image ${index + 1} full size`}
                  >
                    <MediaFrame item={item} index={index} ratio="4 / 3" label={label} />
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}

        {project.documents?.length ? (
          <section className="project__documents" aria-labelledby="project-documents">
            <h2 className="eyebrow" id="project-documents">Documents</h2>
            <ul className="work__documents">
              {project.documents.map((doc) => (
                <li key={doc.src}>
                  <a className="button" href={doc.src} target="_blank" rel="noreferrer noopener">
                    {doc.label} (PDF)
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <Lightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
      />
    </main>
  );
}
