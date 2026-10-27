export function normalizeOrder(order, ids) {
  const valid = new Set(ids);
  const unique = [...new Set(Array.isArray(order) ? order : [])].filter(id => valid.has(id));
  return [...unique, ...ids.filter(id => !unique.includes(id))];
}

export function validOrder(order, ids) {
  return Array.isArray(order) && order.length === ids.length &&
    new Set(order).size === ids.length && order.every(id => ids.includes(id));
}

export function moveRecord(order, id, targetIndex) {
  const next = [...order];
  const from = next.indexOf(id);
  if (from < 0) return next;
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, id);
  return next;
}

// A visitor's playback choice never changes the owner's canonical shelf order.
// Each release exists in exactly one place, and returning it restores its slot.
/** @param {string[]} order @param {string|null} onDeck */
export function recordLocations(order, onDeck = null) {
  return order.map((id, slot) => ({ id, slot, location: id === onDeck ? 'turntable' : 'shelf' }));
}

export function visibleShelf(order, onDeck, active, count = 2) {
  const available = order.filter(id => id !== onDeck);
  if (!available.length) return [];
  const start = Math.max(0, available.indexOf(active));
  return [...available.slice(start), ...available.slice(0, start)].slice(0, count);
}
