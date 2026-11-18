import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './SiteLayout';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { WorkPage } from '../pages/WorkPage';
import { ArchitecturePage } from '../pages/ArchitecturePage';
import { ProjectPage } from '../pages/ProjectPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Route map. The four work worlds share one component but each gets its own
 * layout personality from `src/content/worlds.ts`.
 */
export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="architecture" element={<ArchitecturePage />} />
        <Route path="architecture/:projectId" element={<ProjectPage />} />
        <Route path="travel" element={<WorkPage worldId="travel" />} />
        <Route path="research" element={<WorkPage worldId="research" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
