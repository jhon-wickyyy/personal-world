import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WORLD_STORAGE_KEY,
  WORLD_CANVAS,
  hitTargetWorldSize,
  mobileViewBox,
  clampViewBox,
  normalizePuzzleState,
  serializePuzzleState,
  routeState,
} from '../src/world/world-runtime.js';
import { homeWorldRoutes, routeNodeIds, routeSegments } from '../src/content/home-world-routes.js';

const puzzleIds = [
  'world-puzzle-about',
  'world-puzzle-instagram',
  'world-puzzle-github-a',
  'world-puzzle-github-b',
];

test('storage contract is versioned and namespaced', () => {
  assert.equal(WORLD_STORAGE_KEY, 'personal-world:home:v2');
  const state = { 'world-puzzle-about': true };
  const saved = JSON.parse(serializePuzzleState(state));
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.puzzles, state);
  assert.equal(typeof saved.updatedAt, 'number');
});

test('normalizes empty, legacy-flat and v2 storage without unknown puzzle ids', () => {
  assert.deepEqual(normalizePuzzleState(null, puzzleIds), Object.fromEntries(puzzleIds.map((id) => [id, false])));
  assert.deepEqual(
    normalizePuzzleState({ 'world-puzzle-about': true, unknown: true }, puzzleIds),
    { 'world-puzzle-about': true, 'world-puzzle-instagram': false, 'world-puzzle-github-a': false, 'world-puzzle-github-b': false },
  );
  assert.deepEqual(
    normalizePuzzleState(JSON.stringify({ version: 2, puzzles: { 'world-puzzle-github-a': true } }), puzzleIds),
    { 'world-puzzle-about': false, 'world-puzzle-instagram': false, 'world-puzzle-github-a': true, 'world-puzzle-github-b': false },
  );
  assert.deepEqual(normalizePuzzleState('{bad json', puzzleIds), Object.fromEntries(puzzleIds.map((id) => [id, false])));
});

test('mobile camera uses a dedicated crop and preserves viewport aspect ratio', () => {
  const box = mobileViewBox(390, 844, { x: 800, y: 555 }, 760);
  assert.equal(box.height, 760);
  assert.ok(Math.abs(box.width / box.height - 390 / 844) < 0.001);
  assert.ok(box.x >= 0 && box.y >= 0);
  assert.ok(box.x + box.width <= WORLD_CANVAS.width + 0.01);
  assert.ok(box.y + box.height <= WORLD_CANVAS.height + 0.01);
});

test('mobile camera clamps focus near world edges without leaving canvas', () => {
  const box = mobileViewBox(390, 844, { x: 0, y: 0 }, 760);
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.ok(box.width <= WORLD_CANVAS.width);
  assert.ok(box.height <= WORLD_CANVAS.height);
});

test('clampViewBox keeps camera inside the frozen canvas', () => {
  assert.deepEqual(
    clampViewBox({ x: -100, y: 500, width: 500, height: 800 }),
    { x: 0, y: 200, width: 500, height: 800 },
  );
  assert.deepEqual(
    clampViewBox({ x: 1200, y: -50, width: 900, height: 1200 }),
    { x: 700, y: 0, width: 900, height: 1000 },
  );
});

test('near routes remain gated until their required puzzle state is solved', () => {
  const initial = Object.fromEntries(puzzleIds.map((id) => [id, false]));
  assert.equal(routeState('about', initial).open, false);
  assert.equal(routeState('instagram', initial).open, false);
  assert.equal(routeState('github', initial).open, false);
  assert.equal(routeState('about', { ...initial, 'world-puzzle-about': true }).open, true);
  assert.equal(routeState('instagram', { ...initial, 'world-puzzle-instagram': true }).open, true);
  assert.equal(routeState('github', { ...initial, 'world-puzzle-github-a': true }).open, false);
  assert.equal(routeState('github', { ...initial, 'world-puzzle-github-a': true, 'world-puzzle-github-b': true }).open, true);
});

test('blocked route exposes only its contiguous walkable prefix', () => {
  const initial = Object.fromEntries(puzzleIds.map((id) => [id, false]));
  const about = routeState('about', initial);
  assert.deepEqual(about.walkableNodeIds, routeNodeIds('about').slice(0, 4));
  assert.deepEqual(about.missingPuzzles, ['world-puzzle-about']);
  const githubAOpen = routeState('github', { ...initial, 'world-puzzle-github-a': true });
  assert.deepEqual(githubAOpen.walkableNodeIds, routeNodeIds('github').slice(0, 7));
  assert.deepEqual(githubAOpen.missingPuzzles, ['world-puzzle-github-b']);
});

test('all seven route definitions chain from one home node and terminate at their portal', () => {
  assert.deepEqual(Object.keys(homeWorldRoutes).sort(), ['about', 'architecture', 'fashion', 'github', 'instagram', 'research', 'travel'].sort());
  for (const key of Object.keys(homeWorldRoutes)) {
    const ids = routeNodeIds(key);
    const segments = routeSegments(key);
    assert.equal(ids[0], 'world-node-home', `${key} must start at the shared home node`);
    assert.equal(segments[0].from, 'world-node-home');
    assert.equal(segments.at(-1).to, ids.at(-1));
    assert.ok(segments.every((s, i) => i === 0 || segments[i - 1].to === s.from), `${key} segments must chain`);
  }
});

test('far worlds remain immediately traversable in v0.2', () => {
  const empty = Object.fromEntries(puzzleIds.map((id) => [id, false]));
  for (const key of ['research', 'architecture', 'travel', 'fashion']) {
    assert.equal(routeState(key, empty).open, true, `${key} should not require a puzzle in v0.2`);
  }
});

test('interactive SVG hit zones map to at least 44 CSS pixels', () => {
  assert.equal(hitTargetWorldSize(1.1), 40);
  assert.equal(hitTargetWorldSize(0.5), 88);
  assert.ok(hitTargetWorldSize(0.001) >= 44);
});
