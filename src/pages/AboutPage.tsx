import { about, site, socials } from '../content/site';
import { avatar } from '../content/projects';
import { metaTitle, useDocumentMeta } from '../app/useDocumentMeta';
import { ContentPending, Field, StatusChip } from '../components/ui';
import { isReady } from '../content/types';
import './page.css';

export function AboutPage() {
  useDocumentMeta({ title: metaTitle('About'), image: '/og-image.jpg' });

  return (
    <main className="page__main about" id="main">
      <div className="page__inner">
        <header className="about__head">
          <p className="eyebrow">About</p>
          <div className="about__identity">
            {avatar ? (
              <img className="about__avatar" src={avatar} alt="" width={96} height={96} />
            ) : null}
            <h1 className="display">A personal world,<br />not a portfolio grid.</h1>
          </div>
          <div className="about__lede">
            <Field field={about.lede} label="Introduction" />
          </div>
        </header>

        <hr className="rule" />

        <div className="about__grid">
          <section className="about__block" aria-labelledby="about-background">
            <h2 className="eyebrow" id="about-background">Background</h2>
            <Field field={about.background} label="Background" />
          </section>

          <section className="about__block" aria-labelledby="about-interests">
            <h2 className="eyebrow" id="about-interests">Interests</h2>
            <Field field={about.interests} label="Interests">
              {(items) => (
                <ul className="about__interests">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </Field>
          </section>

          <section className="about__block" aria-labelledby="about-contact">
            <h2 className="eyebrow" id="about-contact">Contact</h2>
            <ul className="about__contact">
              <li>
                <span className="about__contact-key">Email</span>
                <a href={`mailto:${site.email.value}`}>{site.email.value}</a>
              </li>
              <li>
                <span className="about__contact-key">Based in</span>
                <span>{isReady(about.location) ? about.location.value : '—'}</span>
              </li>
            </ul>
          </section>

          <section className="about__block about__block--elsewhere" aria-labelledby="about-links">
            <h2 className="eyebrow" id="about-links">Elsewhere</h2>
            <ul className="about__links">
              {socials.map((entry) => (
                <li key={entry.id} className="about__link">
                  <span className="about__link-label">{entry.label}</span>
                  {entry.status === 'READY' && entry.url ? (
                    <a href={entry.url} target="_blank" rel="noreferrer noopener" className="about__link-value">
                      {entry.handle}
                    </a>
                  ) : (
                    <ContentPending label={`${entry.label} account`} compact />
                  )}
                  <StatusChip status={entry.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="about__note" aria-labelledby="about-note">
          <h2 className="eyebrow" id="about-note">On placeholders</h2>
          <p className="lede">
            Everything marked <strong>CONTENT_PENDING</strong> is waiting for real material.
            This site does not invent biography, projects or social accounts  -  the world is
            real, the content is not there yet.
          </p>
        </section>
      </div>
    </main>
  );
}
