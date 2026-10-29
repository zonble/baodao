export function isEntityVisible(entity, cameraX, viewW) {
  return entity.x + entity.w >= cameraX && entity.x <= cameraX + viewW;
}

export function playerViewportBounds(cameraX, viewW, viewH, mobile = false) {
  const horizontalInset = mobile ? 34 : 10;
  const topInset = mobile ? 18 : 10;
  const bottomInset = mobile ? 96 : 10;

  return {
    minX: cameraX + horizontalInset,
    maxX: cameraX + viewW - horizontalInset,
    minY: topInset,
    maxY: viewH - bottomInset
  };
}
