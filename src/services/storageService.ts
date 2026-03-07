/**
 * Storage service to handle data persistence.
 * Prefers chrome.storage.sync for Chrome Extension environments,
 * falls back to localStorage for web/preview environments.
 */

export interface UserData {
  birthday: string;
  journals?: Record<number, string[]>;
}

const STORAGE_KEY = '4000weeks_user';

export const storageService = {
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
          resolve((result[STORAGE_KEY] as UserData) || null);
        });
      });
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    }
  },

  /**
   * Saves user data to storage.
   */
  async saveUserData(data: UserData): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: data }, () => {
          resolve();
        });
      });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
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
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
};
