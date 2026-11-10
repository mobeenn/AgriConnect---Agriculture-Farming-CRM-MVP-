export function nextId(db, collection, prefix, start) {
  const nums = (db[collection] || [])
    .map((r) => parseInt(String(r.id).replace(`${prefix}-`, ''), 10))
    .filter(Number.isFinite);
  return `${prefix}-${nums.length ? Math.max(...nums) + 1 : start}`;
}
