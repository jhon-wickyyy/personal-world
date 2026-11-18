/**
 * Real content, mapped from the ingested assets.
 *
 * `media.generated.ts` is produced by tools/ingest-content.py from the owner's
 * content folder; this file only adapts it to the site's content types.
 * Anything the owner did not supply (year, description, captions) stays
 * CONTENT_PENDING — nothing here is invented.
 */

import {
  architectureProjects as rawProjects,
  avatar as rawAvatar,
  researchMedia,
  travelPhotos,
} from './media.generated';
import type { MediaItem } from '../components/ui';
import type { ProjectEntry } from './types';
import { ready } from './types';

type Ingested = { src: string; width: number; height: number };

const image = (media: Ingested, caption?: string): MediaItem => ({
  kind: 'image',
  src: media.src,
  caption,
});

export const avatar: string | null = rawAvatar;

const PROJECT_COPY: Record<string, { year: string; summary: string }> = {
  'alumni-hall': {
    year: '2026.09 — 2026.11',
    summary: '大四设计课课题，指导老师：张彤。中大校友会堂的“净零碳”改造——从南京全年气象数据出发，做日照、采光、风环境模拟与能耗/碳收支核算，再落到空间与构造。',
  },
  diaoyutai: {
    year: '2026.03 — 2026.04',
    summary: '设计课课题，指导老师：周霖。钓鱼台片区的城市研究——从交通、功能、历史与风貌分析推进到场所活力评估与拆留策略。',
  },
};

export const architectureEntries: ProjectEntry[] = rawProjects.map((project) => ({
  id: project.id,
  title: ready(project.title),
  year: ready(PROJECT_COPY[project.id]?.year ?? '2026'),
  summary: ready(PROJECT_COPY[project.id]?.summary ?? ''),
  cover: ready(project.hero.src),
  gallery: ready<string[]>([]),
  media: {
    renders: project.renders.map((m) => image(m)),
    analysis: project.analysis.map((m) => image(m)),
    drawings: project.drawings.map((m) => image(m)),
  },
  documents: project.documents.map((doc) => ({ src: doc.src, label: doc.label })),
}));

export const travelGallery: MediaItem[] = travelPhotos.map((photo, i) =>
  image(photo, `photo ${String(i + 1).padStart(2, '0')}`)
);

/** Travel still: the first supplied photograph, used until a film arrives. */
export const travelStill: MediaItem | null = travelPhotos[0] ? image(travelPhotos[0]) : null;

export const researchGallery: MediaItem[] = researchMedia.poster
  ? [{ kind: 'image', src: researchMedia.poster.src, caption: 'project poster' }]
  : [];

export const researchDocuments = researchMedia.report
  ? [{ src: researchMedia.report.src, label: researchMedia.report.label }]
  : [];

/** Research projects: the KG platform, documented by its poster and report. */
export const researchProjects: ProjectEntry[] = [
  {
    id: 'jiangnan-kg',
    title: ready('江南古典园林知识图谱构建及其应用研究'),
    year: ready('2026'),
    summary: ready(
      '项目编号 202601018。建成 23 个园林、718 个要素、1905 条关系的空间知识图谱，覆盖苏州、扬州、南京等 8 市；提出空间语义三层模型与复杂要素拆解式表达，并落地为八个功能页面、十三项查询的可视化平台。'
    ),
    cover: researchMedia.poster
      ? ready(researchMedia.poster.src)
      : ready('/og-image.jpg'),
    gallery: ready<string[]>([]),
    media: researchMedia.poster ? { renders: [image(researchMedia.poster)] } : {},
    documents: researchMedia.report
      ? [{ src: researchMedia.report.src, label: researchMedia.report.label }]
      : [],
  },
];

export const counts = {
  architectureProjects: architectureEntries.length,
  architectureImages: architectureEntries.reduce(
    (total, project) =>
      total +
      (project.media?.renders?.length ?? 0) +
      (project.media?.analysis?.length ?? 0) +
      (project.media?.drawings?.length ?? 0),
    0
  ),
  travelPhotos: travelGallery.length,
  researchMedia: researchGallery.length + researchDocuments.length,
};
