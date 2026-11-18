import { Navigate, useParams } from 'react-router-dom';
import { worldById, worlds } from '../content/worlds';
import { ContentPending, Field, Gallery, MediaFrame } from '../components/ui';
import { VideoHero } from '../components/VideoHero';
import { metaTitle, useDocumentMeta } from '../app/useDocumentMeta';
import type { WorldEntry } from '../content/types';
import './page.css';

/** Each world renders a structurally different layout, not a reskin. */
type Layout = 'editorial' | 'media' | 'index';

const LAYOUT: Record<WorldEntry['id'], Layout> = {
  architecture: 'editorial',
  travel: 'media',
  research: 'index',
};

/** Media-led worlds open with a wide hero frame instead of a title block. */
const HERO_RATIO: Partial<Record<WorldEntry['id'], string>> = {
  travel: '21 / 9',
};

const GALLERY_RATIO: Record<WorldEntry['id'], string> = {
  architecture: '4 / 3',
  travel: '3 / 2',
  research: '16 / 9',
};

export function WorkPage({ worldId }: { worldId?: WorldEntry['id'] }) {
  const params = useParams();
  const id = worldId ?? (params.world as WorldEntry['id'] | undefined);
  const known = id !== undefined && worlds.some((w) => w.id === id);
  /* hooks must run unconditionally, so resolve the world before any early return */
  const world = known ? worldById(id!) : null;

  useDocumentMeta({
    title: metaTitle(world?.label ?? 'Not found'),
    image: world?.hero?.src ?? '/og-image.jpg',
  });

  if (!known || !world) return <Navigate to="/" replace />;

  const layout = LAYOUT[id!];
  const heroRatio = HERO_RATIO[id!];

  return (
    <main className={`page__main work work--${layout}`} data-world={id} id="main">
      <div className="page__inner">
        <header className="work__head">
          <div className="work__titles">
            <p className="eyebrow">{world.label}</p>
            <h1 className="work__title display">{world.label}</h1>
          </div>
          <div className="work__tagline">
            <Field field={world.tagline} label={`${world.label} tagline`} compact />
          </div>
        </header>

        {heroRatio ? (
          world.hero ? (
            <div className="work__hero work__hero--still">
              <MediaFrame item={world.hero} index={0} ratio={heroRatio} label={`${world.label} hero`} priority />
              <ContentPending
                label={`${world.label} film`}
                source="a short mp4 / webm to replace this still"
                compact
              />
            </div>
          ) : (
            <VideoHero
              item={null}
              label={`${world.label} featured media`}
              ratio={heroRatio}
              className="work__hero"
            />
          )
        ) : null}

        <div className="work__body">
          <section className="work__intro" aria-labelledby="work-intro">
            <h2 className="eyebrow" id="work-intro">Introduction</h2>
            <Field field={world.intro} label={`${world.label} introduction`} />
          </section>

          <section className="work__projects" aria-labelledby="work-projects">
            <div className="work__projects-head">
              <h2 className="eyebrow" id="work-projects">Projects</h2>
              <span className="work__count">{world.projects.length} supplied</span>
            </div>

            {world.projects.length === 0 ? (
              <ContentPending
                label={`${world.label} projects`}
                source="project folders / images / descriptions"
              />
            ) : (
              <ul className="work__list">
                {world.projects.map((project) => (
                  <li className="work__item" key={project.id}>
                    <h3 className="work__item-title">{project.title.value ?? project.id}</h3>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="work__gallery" aria-labelledby="work-gallery">
          <h2 className="eyebrow" id="work-gallery">Gallery</h2>
          <Gallery
            items={world.gallery ?? null}
            label={`${world.label} imagery`}
            expected={4}
            ratio={GALLERY_RATIO[id]}
          />
          {world.documents?.length ? (
            <ul className="work__documents">
              {world.documents.map((doc) => (
                <li key={doc.src}>
                  <a className="button" href={doc.src} target="_blank" rel="noreferrer noopener">
                    {doc.label} (PDF)
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
