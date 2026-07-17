/**
 * localStorage wrappers that never throw. Safari Private Mode and
 * quota-exceeded situations raise on both reads and writes; the app should
 * degrade to in-memory state instead of white-screening.
 */

export function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / quota exceeded — state stays in memory for this session.
  }
}
