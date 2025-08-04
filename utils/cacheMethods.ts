const CACHE_KEY = "userInfo";

function addToCache(newValue: string) {
  const existing = localStorage.getItem(CACHE_KEY) || "";
  const items = new Set(existing.split("|").filter(Boolean));

  if (!items.has(newValue)) {
    items.add(newValue);
    const updated = Array.from(items).join("|");
    localStorage.setItem(CACHE_KEY, updated);
  }
}
function getCache(): string[] {
  const existing = localStorage.getItem(CACHE_KEY) || "";
  return existing.split("|").filter(Boolean);
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}