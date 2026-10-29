import test from 'node:test';
import assert from 'node:assert/strict';
import { fullscreenButtonLabel, resetInputState } from '../js/mobileExperience.js';

test('fullscreen button label reflects the current fullscreen state', () => {
  assert.equal(fullscreenButtonLabel(false), '⛶ 全螢幕');
  assert.equal(fullscreenButtonLabel(true), '⛶ 離開全螢幕');
});

test('resetInputState releases every held game input', () => {
  const input = {
    up: true,
    down: true,
    left: true,
    right: true,
    shoot: true,
    bomb: true
  };

  resetInputState(input);

  assert.deepEqual(input, {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    bomb: false
  });
});
