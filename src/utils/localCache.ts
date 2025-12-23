export function readJsonCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const cached = window.localStorage.getItem(key)
    return cached ? (JSON.parse(cached) as T) : null
  } catch (error) {
    console.warn(`[localCache] Failed to read "${key}"`, error)
    return null
  }
}

export function writeJsonCache(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[localCache] Failed to write "${key}"`, error)
  }
}
