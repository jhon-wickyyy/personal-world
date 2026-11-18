import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { nav, site } from '../content/site';
import { isReady } from '../content/types';
import { SceneTransitionProvider } from '../features/scene-transition/SceneTransitionProvider';

/**
 * Shell: a light sticky nav (so visitors who would rather not explore can still
 * navigate), a skip link that bypasses the world entirely, and the routed page.
 *
 * Each page renders its own <main>, because on "/" the Home World host element
 * IS the main landmark -nesting a second <main> would be invalid.
 */
export function SiteLayout() {
  const { pathname } = useLocation();
  const immersive = pathname === '/';
  const owner = isReady(site.owner) ? site.owner.value : null;

  return (
    <SceneTransitionProvider>
      <>
        <a className="skip-link" href="#page-start">
          Skip the world - go straight to content
        </a>

        <header className="site-header">
          <NavLink to="/" className="site-header__brand" aria-label="Personal World, home">
            <span className="site-header__brand-mark" aria-hidden="true">
              PW
            </span>
            <span className="site-header__brand-full">{owner ?? 'Personal World'}</span>
          </NavLink>

          <nav className="site-nav" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className="site-nav__link"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <div id="page-start" className={`page ${immersive ? 'page--immersive' : ''}`}>
          <Outlet />
          {!immersive && (
            <footer className="site-footer">
              <div className="site-footer__inner">
                <span>Personal World</span>
                <span>Exploration is optional. Every page is reachable from the nav.</span>
              </div>
            </footer>
          )}
        </div>
      </>
    </SceneTransitionProvider>
  );
}
