import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeWorldView } from '../world-home/HomeWorldView';
import { metaTitle, useDocumentMeta } from '../app/useDocumentMeta';
import { useHomeWorldIntro } from '../features/home-world/intro/useHomeWorldIntro';
import { useSceneTransition } from '../features/scene-transition/SceneTransitionProvider';
import { Modal, ContentPending } from '../components/ui';
import { instagramProfile, socials } from '../content/site';
import type { HomeWorldHandle } from '../world-home/types';
import './home.css';

const WORLD_KEYS = new Set(['architecture', 'travel', 'research']);

/**
 * "/" -the world takes the whole viewport.
 *
 * Portal routing:
 *   about                       -> /about
 *   github                      -> the verified GitHub profile (new tab)
 *   instagram                   -> CONTENT_PENDING modal (no URL was supplied)
 *   architecture|travel|...     -> /architecture, /travel, ...
 */
export function HomePage() {
  const navigate = useNavigate();
  useDocumentMeta({
    title: metaTitle(),
    description: 'An explorable isometric world instead of a portfolio grid.',
    image: '/og-image.jpg',
  });
  const [pendingPortal, setPendingPortal] = useState<string | null>(null);
  const worldRef = useRef<HomeWorldHandle | null>(null);
  const [worldReady, setWorldReady] = useState(false);
  const { isPlaying: introPlaying, skipIntro } = useHomeWorldIntro(worldReady);
  const { transitionTo } = useSceneTransition();

  const handleActivate = useCallback(
    (key: string, portal?: Element) => {
      if (WORLD_KEYS.has(key) || key === 'about') {
        const destination = `/${key}`;
        const label = key === 'about' ? 'About' : key.charAt(0).toUpperCase() + key.slice(1);
        void transitionTo({
          label,
          scene: key === 'architecture' ? 'architecture' : 'generic',
          origin: portal,
          onCover: () => navigate(destination),
        });
        return;
      }
      if (key === 'github') {
        const github = socials.find((entry) => entry.id === 'github');
        if (github?.url) window.open(github.url, '_blank', 'noopener,noreferrer');
        return;
      }
      setPendingPortal(key);
    },
    [navigate, transitionTo]
  );

  return (
    <>
      <HomeWorldView
        onPortalActivate={handleActivate}
        onReady={(handle) => {
          worldRef.current = handle;
          setWorldReady(true);
        }}
      />

      {introPlaying && (
        <button type="button" className="home-intro-skip" onClick={skipIntro}>
          Skip intro
        </button>
      )}

      <div className="home-chrome">
        <div className="home-chrome__intro">
          <h1 className="home-chrome__name">Personal World</h1>
          <p className="home-chrome__hint">
            Move to look around. Click a mechanism to change the space. Walk to a gate to travel.
          </p>
        </div>
        <button
          type="button"
          className="button button--quiet home-chrome__reset"
          onClick={() => worldRef.current?.returnHome()}
        >
          Return to centre
        </button>
      </div>

      <Modal
        open={pendingPortal !== null}
        title={pendingPortal === 'instagram' ? 'Instagram' : 'Portal'}
        onClose={() => setPendingPortal(null)}
      >
        <p className="lede" style={{ marginBottom: 'var(-space-4)' }}>
          This portal is reachable, but its destination has not been supplied yet.
        </p>
        <ContentPending
          label={pendingPortal === 'instagram' ? 'Instagram URL and handle' : 'portal destination'}
          source={pendingPortal === 'instagram' ? `${instagramProfile.label} account` : undefined}
        />
      </Modal>
    </>
  );
}
