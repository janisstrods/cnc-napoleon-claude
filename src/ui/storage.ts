// The browser's localStorage, for the player's settings and the autosave. Any access may throw (storage disabled or
// blocked, a private window, a full quota): a read then finds nothing and a write or removal is dropped.

/** Every localStorage key of this game starts with this, so it never clashes with another game on the same origin. */
export const STORAGE_PREFIX = 'ccn-';

/** The localStorage key for `name`. Build every key with this, never with a string literal. */
export function storageKey(name: string): string {
  return STORAGE_PREFIX + name;
}

export const storage = {
  /** The value stored under `key`, or null (none, or storage unavailable). */
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  /** Store `value` under `key` (dropped when storage is unavailable). */
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  /** Remove `key` (nothing happens when storage is unavailable). */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
