export function setBlockSafe(dimension, location, typeId) {
  try {
    const block = dimension.getBlock(location);
    if (!block) return false;
    block.setType(typeId);
    return true;
  } catch {
    return false;
  }
}

export function getBlockTypeId(dimension, location) {
  try {
    return dimension.getBlock(location)?.typeId ?? null;
  } catch {
    return null;
  }
}

export function isInnerFieldCoord(field, x, z) {
  const size = field.size ?? 10;
  const innerMinX = field.originX + 1;
  const innerMaxX = field.originX + size;
  const innerMinZ = field.originZ + 1;
  const innerMaxZ = field.originZ + size;
  return x >= innerMinX && x <= innerMaxX && z >= innerMinZ && z <= innerMaxZ;
}

export function forEachInnerCell(field, callback) {
  const size = field.size ?? 10;
  for (let dx = 1; dx <= size; dx++) {
    for (let dz = 1; dz <= size; dz++) {
      callback(field.originX + dx, field.y, field.originZ + dz);
    }
  }
}
