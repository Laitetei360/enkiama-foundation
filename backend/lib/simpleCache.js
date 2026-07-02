const store = new Map();

function now() {
  return Date.now();
}

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value, ttlMs) {
  if (!ttlMs || ttlMs <= 0) return value;
  store.set(key, { value, expiresAt: now() + ttlMs });
  return value;
}

function clearCache(prefix = '') {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
}

module.exports = { getCache, setCache, clearCache };
