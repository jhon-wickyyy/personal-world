import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { gsap } from 'gsap';
import { getCoverRadius, resolveTransitionPoint } from './transition-geometry';
import type { SceneTransitionContextValue, SceneTransitionRequest } from './types';
import './scene-transition.css';
import './architecture-scene.css';

const SceneTransitionContext = createContext<SceneTransitionContextValue | null>(null);

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      window.setTimeout(resolve, 32);
    }
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function SceneTransitionProvider({ children }: PropsWithChildren) {
  const layerRef = useRef<HTMLDivElement>(null);
  const irisRef = useRef<HTMLDivElement>(null);
  const foldARef = useRef<HTMLDivElement>(null);
  const foldBRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const archRef = useRef<HTMLDivElement>(null);
  const archGlowRef = useRef<HTMLDivElement>(null);
  const archGridRef = useRef<HTMLDivElement>(null);
  const archPlanesRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => () => {
    timelineRef.current?.kill();
    timelineRef.current = null;
  }, []);

  const transitionTo = useCallback(async ({ label, origin, scene = 'generic', onCover }: SceneTransitionRequest) => {
    if (activeRef.current) return false;
    activeRef.current = true;
    setIsTransitioning(true);

    const layer = layerRef.current;
    const iris = irisRef.current;
    const foldA = foldARef.current;
    const foldB = foldBRef.current;
    const labelNode = labelRef.current;
    const arch = archRef.current;
    const archGlow = archGlowRef.current;
    const archGrid = archGridRef.current;
    const archPlanes = archPlanesRef.current;
    const isArchitecture = scene === 'architecture' && Boolean(arch && archGlow && archGrid && archPlanes);

    if (!layer || !iris || !foldA || !foldB || !labelNode) {
      try {
        onCover();
      } finally {
        activeRef.current = false;
        setIsTransitioning(false);
      }
      return true;
    }

    if (prefersReducedMotion()) {
      try {
        onCover();
        return true;
      } finally {
        activeRef.current = false;
        setIsTransitioning(false);
      }
    }

    const point = resolveTransitionPoint(origin, window);
    const radius = getCoverRadius(point, window.innerWidth, window.innerHeight);
    const originCss = `${point.x}px ${point.y}px`;
    const homeWorld = document.querySelector<HTMLElement>('.home-world');

    layer.dataset.state = 'covering';
    layer.dataset.scene = isArchitecture ? 'architecture' : 'generic';
    layer.dataset.destination = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    layer.style.setProperty('--transition-origin-x', `${point.x}px`);
    layer.style.setProperty('--transition-origin-y', `${point.y}px`);
    layer.style.display = 'block';
    layer.setAttribute('aria-hidden', 'false');
    labelNode.textContent = label;

    gsap.set(layer, { autoAlpha: 1 });
    gsap.set(iris, { '--transition-hole': `${radius}px` });
    gsap.set([foldA, foldB], { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.72, rotationX: -58, rotationZ: -12 });
    gsap.set(labelNode, { autoAlpha: 0, y: 12 });

    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    timelineRef.current = timeline;

    if (isArchitecture && arch && archGlow && archGrid && archPlanes) {
      /* -------------------------------------------------- architecture scene
         Portal glow → camera push-in → isometric planes unfold → grid reveal.
         Everything happens inside the overlay; the runtime's camera and the
         character transform are never touched. */
      const planes = [...archPlanes.children] as HTMLElement[];

      arch.dataset.active = 'true';
      gsap.set(archGlow, { scale: 0.35, autoAlpha: 0, transformOrigin: '50% 50%' });
      gsap.set(archPlanes, { autoAlpha: 1 });
      gsap.set(planes, {
        autoAlpha: 0,
        rotationX: -74,
        y: 26,
        scaleY: 0.16,
        transformOrigin: '50% 100%',
        transformPerspective: 900,
      });
      gsap.set(archGrid, { autoAlpha: 0, scale: 1.06, transformOrigin: '50% 50%' });

      timeline
        .to(iris, { '--transition-hole': '0px', duration: 0.86, ease: 'power3.inOut' }, 0)
        .to(archGlow, { autoAlpha: 0.9, scale: 1.5, duration: 0.34, ease: 'power2.out' }, 0)
        .to(archGlow, { autoAlpha: 0.55, scale: 2.4, duration: 0.52, ease: 'power2.inOut' }, 0.34)
        .to(planes, {
          autoAlpha: 1,
          rotationX: 0,
          y: 0,
          scaleY: 1,
          duration: 0.52,
          stagger: 0.075,
          ease: 'power3.out',
        }, 0.16)
        .to(archGrid, { autoAlpha: 0.55, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.42)
        .to(labelNode, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.5);

      if (homeWorld) {
        /* camera push-in: the world rises toward the viewer and falls back */
        timeline.to(homeWorld, {
          scale: 1.14,
          rotationX: 10,
          rotationZ: -1.6,
          transformPerspective: 1400,
          transformOrigin: originCss,
          autoAlpha: 0.18,
          duration: 0.78,
          ease: 'power2.in',
        }, 0.04);
      }
    } else {
      timeline
        .to(iris, {
          '--transition-hole': '0px',
          duration: 0.82,
          ease: 'power3.inOut',
        }, 0)
        .to(foldA, {
          autoAlpha: 0.82,
          scale: 1.08,
          rotationX: 0,
          rotationZ: 0,
          duration: 0.78,
          ease: 'power3.inOut',
        }, 0.03)
        .to(foldB, {
          autoAlpha: 0.68,
          scale: 1.02,
          rotationX: 0,
          rotationZ: 0,
          duration: 0.74,
          ease: 'power3.inOut',
        }, 0.1)
        .to(labelNode, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' }, 0.42);

      if (homeWorld) {
        timeline.to(homeWorld, {
          scale: 0.93,
          rotationX: 7,
          rotationZ: -2.2,
          transformPerspective: 1200,
          transformOrigin: originCss,
          autoAlpha: 0.14,
          duration: 0.72,
          ease: 'power2.in',
        }, 0.06);
      }
    }

    let didCover = false;
    try {
      await new Promise<void>((resolve) => timeline.eventCallback('onComplete', resolve));
      didCover = true;
      onCover();
      layer.dataset.state = 'revealing';
      await nextPaint();

      await new Promise<void>((resolve) => {
        gsap.to(iris, {
          '--transition-hole': `${radius}px`,
          duration: 0.76,
          ease: 'power3.inOut',
          onComplete: resolve,
        });
        gsap.to(labelNode, { autoAlpha: 0, y: -8, duration: 0.2, ease: 'power2.in' });
        gsap.to([foldA, foldB], { autoAlpha: 0, duration: 0.28, ease: 'power2.in' });
        if (archGlow && archGrid && archPlanes) {
          gsap.to([archGlow, archGrid, archPlanes], { autoAlpha: 0, duration: 0.32, ease: 'power2.in' });
        }
      });

      gsap.set(layer, { autoAlpha: 0, display: 'none' });
      gsap.set([iris, foldA, foldB, labelNode], { clearProps: 'all' });
      if (arch) {
        delete arch.dataset.active;
        gsap.set([archGlow, archGrid, archPlanes], { clearProps: 'all' });
        if (archPlanes) gsap.set([...archPlanes.children], { clearProps: 'all' });
      }
      if (homeWorld) gsap.set(homeWorld, { clearProps: 'transform,opacity,visibility' });
      layer.style.removeProperty('--transition-origin-x');
      layer.style.removeProperty('--transition-origin-y');
      delete layer.dataset.destination;
      delete layer.dataset.scene;
      layer.dataset.state = 'idle';
      layer.setAttribute('aria-hidden', 'true');
      return true;
    } catch {
      if (!didCover) {
        didCover = true;
        onCover();
      }
      gsap.set(layer, { autoAlpha: 0, display: 'none' });
      gsap.set([iris, foldA, foldB, labelNode], { clearProps: 'all' });
      if (arch) delete arch.dataset.active;
      if (homeWorld) gsap.set(homeWorld, { clearProps: 'transform,opacity,visibility' });
      layer.style.removeProperty('--transition-origin-x');
      layer.style.removeProperty('--transition-origin-y');
      delete layer.dataset.scene;
      layer.dataset.state = 'idle';
      layer.setAttribute('aria-hidden', 'true');
      return false;
    } finally {
      timeline.kill();
      timelineRef.current = null;
      activeRef.current = false;
      setIsTransitioning(false);
    }
  }, []);

  const value = useMemo(() => ({ isTransitioning, transitionTo }), [isTransitioning, transitionTo]);

  return (
    <SceneTransitionContext.Provider value={value}>
      {children}
      <div
        ref={layerRef}
        className="scene-transition"
        data-state="idle"
        aria-hidden="true"
        aria-live="polite"
      >
        <div ref={irisRef} className="scene-transition__iris">
          <div ref={foldARef} className="scene-transition__fold scene-transition__fold--a" />
          <div ref={foldBRef} className="scene-transition__fold scene-transition__fold--b" />
          <div className="scene-transition__portal-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div ref={archRef} className="transition-arch" data-active={undefined} aria-hidden="true">
            <div ref={archGlowRef} className="transition-arch__glow" />
            <div ref={archGridRef} className="transition-arch__grid" />
            <div ref={archPlanesRef} className="transition-arch__planes">
              <span className="transition-arch__plane transition-arch__plane--1" />
              <span className="transition-arch__plane transition-arch__plane--2" />
              <span className="transition-arch__plane transition-arch__plane--3" />
            </div>
          </div>
          <p ref={labelRef} className="scene-transition__label">Entering a new world</p>
        </div>
      </div>
    </SceneTransitionContext.Provider>
  );
}

export function useSceneTransition(): SceneTransitionContextValue {
  const context = useContext(SceneTransitionContext);
  if (!context) throw new Error('useSceneTransition must be used within SceneTransitionProvider');
  return context;
}
