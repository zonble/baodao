import test from 'node:test';
import assert from 'node:assert/strict';
import { isEntityVisible, playerViewportBounds } from '../js/gameplayRules.js';

test('an entity is not visible before it enters the camera viewport', () => {
  const entity = { x: 820, w: 40 };

  assert.equal(isEntityVisible(entity, 0, 800), false);
  assert.equal(isEntityVisible(entity, 40, 800), true);
});

test('an entity partially overlapping the viewport is visible', () => {
  const entity = { x: -20, w: 40 };

  assert.equal(isEntityVisible(entity, 0, 800), true);
});

test('mobile player bounds reserve space for the overlay controls', () => {
  assert.deepEqual(playerViewportBounds(0, 800, 480, true), {
    minX: 34,
    maxX: 766,
    minY: 18,
    maxY: 384
  });
});
