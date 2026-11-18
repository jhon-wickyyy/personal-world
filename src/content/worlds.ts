/**
 * The four work worlds.
 *
 * Each world has its own layout personality but no invented projects: the
 * portfolio folders have not been supplied yet, so every world ships with an
 * empty project list and a visible CONTENT_PENDING state.
 */

import { pending, ready } from './types';
import { architectureEntries, researchDocuments, researchGallery, researchProjects, travelGallery, travelStill } from './projects';
import type { WorldEntry } from './types';

export const worlds: WorldEntry[] = [
  {
    id: 'architecture',
    label: 'Architecture',
    path: '/architecture',
    accent: 'blue',
    tagline: ready('东南大学建筑系设计课的两个课题：一个建成改造，一个城市研究。'),
    intro: ready('两个项目都来自建筑系设计课。一个是中大校友会堂的“净零碳”改造，从气象数据、日照与采光模拟推到构造与能耗核算；另一个是钓鱼台的片区城市研究，从交通、功能、风貌一路做到拆留策略。'),
    projects: architectureEntries,
  },
  {
    id: 'travel',
    label: 'Travel',
    path: '/travel',
    accent: 'green',
    tagline: pending<string>('one line about the way you travel'),
    intro: pending<string>('a short introduction to the travel world'),
    projects: [],
    gallery: travelGallery,
    hero: travelStill ?? undefined,
  },
  {
    id: 'research',
    label: 'Research',
    path: '/research',
    accent: 'lilac',
    tagline: ready('江南古典园林的空间知识图谱：把“园子怎么被走完”变成可查询的数据。'),
    intro: ready('江南古典园林知识图谱构建及其应用研究（项目编号 202601018）。建成 23 个园林、718 个要素、1905 条关系的空间知识图谱，覆盖苏州、扬州、南京等 8 市；提出“空间语义三层模型（位置—关系—游线）”与“复杂要素拆解式表达”，并落地为可视化平台：知识浏览与检索、空间布局还原、游览动线复原（沧浪亭 14 站闭环 487.7 米、狮子林 28 站 770.8 米）、空间关系分析与路径查询。'),
    projects: researchProjects,
    gallery: researchGallery,
    documents: researchDocuments,
  },
];

export const worldById = (id: WorldEntry['id']): WorldEntry =>
  worlds.find((world) => world.id === id)!;
