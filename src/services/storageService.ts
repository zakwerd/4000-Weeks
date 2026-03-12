/**
 * Storage service to handle data persistence.
 * Prefers chrome.storage.sync for Chrome Extension environments,
 * falls back to localStorage for web/preview environments.
 */

export interface UserData {
  birthday: string;
  journals?: Record<number, string[]>;
}

type LegacyUserData = {
  birthday?: unknown;
  birthDate?: unknown;
  journals?: unknown;
  journalEntries?: unknown;
  version?: unknown;
};

export const STORAGE_KEY = '4000weeks_user';
const JOURNAL_ENTRY_COUNT = 3;

function normalizeJournalEntries(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return Array.from({ length: JOURNAL_ENTRY_COUNT }, () => '');
  }

  const normalized = value
    .slice(0, JOURNAL_ENTRY_COUNT)
    .map((entry) => (typeof entry === 'string' ? entry : ''));

  while (normalized.length < JOURNAL_ENTRY_COUNT) {
    normalized.push('');
  }

  return normalized;
}

function normalizeJournals(value: unknown): Record<number, string[]> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([weekIndex]) => Number.isInteger(Number(weekIndex)))
    .map(([weekIndex, entries]) => [Number(weekIndex), normalizeJournalEntries(entries)] as const);

  return Object.fromEntries(normalizedEntries);
}

export function normalizeUserData(raw: unknown): UserData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as LegacyUserData;
  const birthday = typeof candidate.birthday === 'string'
    ? candidate.birthday
    : typeof candidate.birthDate === 'string'
      ? candidate.birthDate
      : null;

  if (!birthday) {
    return null;
  }

  const journals = normalizeJournals(candidate.journals ?? candidate.journalEntries);
  return { birthday, journals };
}

export function createStorageService() {
  let writeQueue = Promise.resolve();

  return {
  /**
   * Checks if the chrome.storage API is available.
   */
    isChromeStorageAvailable(): boolean {
      return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync;
    },

    /**
     * Gets user data from storage.
     */
    async getUserData(): Promise<UserData | null> {
      if (this.isChromeStorageAvailable()) {
        return new Promise((resolve) => {
          chrome.storage.sync.get([STORAGE_KEY], (result) => {
            resolve(normalizeUserData(result[STORAGE_KEY]));
          });
        });
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return null;
      }

      try {
        return normalizeUserData(JSON.parse(saved));
      } catch {
        return null;
      }
    },

    /**
     * Saves user data to storage.
     */
    async saveUserData(data: UserData): Promise<void> {
      const normalizedData = normalizeUserData(data);
      if (!normalizedData) {
        return;
      }

      writeQueue = writeQueue.then(async () => {
        if (this.isChromeStorageAvailable()) {
          await new Promise<void>((resolve) => {
            chrome.storage.sync.set({ [STORAGE_KEY]: normalizedData }, () => {
              resolve();
            });
          });
          return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
      });

      return writeQueue;
    },

    /**
     * Removes user data from storage.
     */
    async removeUserData(): Promise<void> {
      if (this.isChromeStorageAvailable()) {
        return new Promise((resolve) => {
          chrome.storage.sync.remove([STORAGE_KEY], () => {
            resolve();
          });
        });
      }

      localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export const storageService = createStorageService();
