export function pickRandomItems(items, count) {
  if (items.length <= count) {
    return [...items];
  }
  const pool = [...items];
  const picked = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
