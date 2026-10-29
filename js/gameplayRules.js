export function isEntityVisible(entity, cameraX, viewW) {
  return entity.x + entity.w >= cameraX && entity.x <= cameraX + viewW;
}
