export function fullscreenButtonLabel(isFullscreen) {
  return isFullscreen ? '⛶ 離開全螢幕' : '⛶ 全螢幕';
}

export function resetInputState(input) {
  for (const key of Object.keys(input)) {
    input[key] = false;
  }
}
