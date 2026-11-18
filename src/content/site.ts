/**
 * Site-level content.
 *
 * Values below come from the owner's `about/about.txt` and the two project
 * `readme.txt` files. Anything not supplied stays CONTENT_PENDING.
 */

import { pending, ready } from './types';
import type { NavItem, SocialEntry } from './types';

export const site = {
  name: 'Personal World',
  owner: ready('杨思成'),
  email: ready('ysichengy@gmail.com'),
  /** the single-line statement under the H1 on /about */
  statement: pending<string>('a single sentence describing the work'),
} as const;

export const socials: SocialEntry[] = [
  {
    id: 'github',
    label: 'GitHub',
    status: 'READY',
    url: 'https://github.com/jhon-wickyyy',
    handle: 'jhon-wickyyy',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    status: 'CONTENT_PENDING',
    url: null,
    handle: null,
  },
];

export const nav: NavItem[] = [
  { label: 'World', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Architecture', to: '/architecture', world: 'architecture' },
  { label: 'Travel', to: '/travel', world: 'travel' },
  { label: 'Research', to: '/research', world: 'research' },
];

/** About page copy — from `about/about.txt`. */
export const about = {
  lede: ready(
    '我是杨思成，东南大学建筑系本科生。比起把作品排成一张网格，我更愿意把它们放进一个可以走进去的空间里。'
  ),
  background: ready('本科生，现就读于东南大学建筑系。'),
  location: ready('南京'),
  interests: ready<string[]>(['健身', '篮球', '吉他', '游戏（最近常打三角洲）']),
  contact: ready('ysichengy@gmail.com'),
} as const;

export const githubProfile = socials.find((entry) => entry.id === 'github')!;
export const instagramProfile = socials.find((entry) => entry.id === 'instagram')!;

export const githubUrl = ready(githubProfile.url!);
