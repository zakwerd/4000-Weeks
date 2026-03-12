import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  createStorageService,
  normalizeUserData,
  type UserData,
} from './storageService';

type ChromeStorageBackingStore = Record<string, unknown>;

function createChromeStorageMock(
  backingStore: ChromeStorageBackingStore = {},
  options: { deferSetCommits?: boolean } = {},
) {
  const pendingSetCommits: Array<() => void> = [];

  const sync = {
    get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
      const requestedKey = Array.isArray(keys) ? keys[0] : keys;
      callback({ [requestedKey]: backingStore[requestedKey] });
    }),
    set: vi.fn((value: Record<string, unknown>, callback?: () => void) => {
      const commit = () => {
        Object.assign(backingStore, value);
        callback?.();
      };

      if (options.deferSetCommits) {
        pendingSetCommits.push(commit);
        return;
      }

      commit();
    }),
    remove: vi.fn((keys: string[], callback?: () => void) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((key) => {
        delete backingStore[key];
      });
      callback?.();
    }),
  };

  return {
    chrome: {
      storage: {
        sync,
      },
    },
    flushNextSet() {
      const nextCommit = pendingSetCommits.shift();
      nextCommit?.();
    },
    flushAllSets() {
      while (pendingSetCommits.length > 0) {
        const nextCommit = pendingSetCommits.shift();
        nextCommit?.();
      }
    },
    pendingSetCount() {
      return pendingSetCommits.length;
    },
  };
}

function setChromeStorage(chromeMock: { storage: { sync: unknown } } | undefined) {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    writable: true,
    value: chromeMock,
  });
}

function sampleUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    birthday: '1990-01-01',
    journals: {
      0: ['one', 'two', 'three'],
    },
    ...overrides,
  };
}

describe('storageService reliability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setChromeStorage(undefined);
  });

  it('returns null for missing keys in the local fallback store', async () => {
    const service = createStorageService();

    await expect(service.getUserData()).resolves.toBeNull();
  });

  it('returns null instead of throwing for malformed JSON in local storage', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{birthday:');

    const service = createStorageService();

    await expect(service.getUserData()).resolves.toBeNull();
  });

  it('normalizes old schema versions into the current user data shape', () => {
    expect(
      normalizeUserData({
        version: 1,
        birthDate: '1990-01-01',
        journalEntries: {
          2: ['legacy entry'],
        },
      }),
    ).toEqual({
      birthday: '1990-01-01',
      journals: {
        2: ['legacy entry', '', ''],
      },
    });
  });

  it('persists state across refresh simulation with chrome.storage', async () => {
    const backingStore: ChromeStorageBackingStore = {};
    const chromeMock = createChromeStorageMock(backingStore);
    setChromeStorage(chromeMock.chrome);

    const firstTabService = createStorageService();
    await firstTabService.saveUserData(sampleUserData());

    const refreshedTabService = createStorageService();

    await expect(refreshedTabService.getUserData()).resolves.toEqual(sampleUserData());
  });

  it('persists state across new-tab creation simulation with chrome.storage', async () => {
    const backingStore: ChromeStorageBackingStore = {};
    const chromeMock = createChromeStorageMock(backingStore);
    setChromeStorage(chromeMock.chrome);

    const originalTabService = createStorageService();
    await originalTabService.saveUserData(sampleUserData({ journals: { 5: ['a', 'b', 'c'] } }));

    const newTabService = createStorageService();

    await expect(newTabService.getUserData()).resolves.toEqual({
      birthday: '1990-01-01',
      journals: { 5: ['a', 'b', 'c'] },
    });
  });

  it('persists state across browser restart simulation with a new chrome API wrapper', async () => {
    const backingStore: ChromeStorageBackingStore = {};
    const firstChromeMock = createChromeStorageMock(backingStore);
    setChromeStorage(firstChromeMock.chrome);

    const beforeRestartService = createStorageService();
    await beforeRestartService.saveUserData(sampleUserData({ journals: { 7: ['x', 'y', 'z'] } }));

    const restartedChromeMock = createChromeStorageMock(backingStore);
    setChromeStorage(restartedChromeMock.chrome);
    const afterRestartService = createStorageService();

    await expect(afterRestartService.getUserData()).resolves.toEqual({
      birthday: '1990-01-01',
      journals: { 7: ['x', 'y', 'z'] },
    });
  });

  it('persists state across extension reload simulation', async () => {
    const backingStore: ChromeStorageBackingStore = {};
    const chromeMock = createChromeStorageMock(backingStore);
    setChromeStorage(chromeMock.chrome);

    const beforeReloadService = createStorageService();
    await beforeReloadService.saveUserData(sampleUserData({ journals: { 9: ['reload', 'still', 'here'] } }));

    setChromeStorage(createChromeStorageMock(backingStore).chrome);
    const afterReloadService = createStorageService();

    await expect(afterReloadService.getUserData()).resolves.toEqual({
      birthday: '1990-01-01',
      journals: { 9: ['reload', 'still', 'here'] },
    });
  });

  it('returns null for missing keys in chrome.storage', async () => {
    const chromeMock = createChromeStorageMock({});
    setChromeStorage(chromeMock.chrome);

    const service = createStorageService();

    await expect(service.getUserData()).resolves.toBeNull();
  });

  it('serializes rapid consecutive chrome saves to avoid race-condition overwrites', async () => {
    const backingStore: ChromeStorageBackingStore = {};
    const chromeMock = createChromeStorageMock(backingStore, { deferSetCommits: true });
    setChromeStorage(chromeMock.chrome);

    const service = createStorageService();
    const firstSave = service.saveUserData(sampleUserData({ journals: { 1: ['first', '', ''] } }));
    const secondSave = service.saveUserData(sampleUserData({ journals: { 1: ['second', '', ''] } }));

    await Promise.resolve();

    expect(chromeMock.chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    expect(chromeMock.pendingSetCount()).toBe(1);

    chromeMock.flushNextSet();
    await firstSave;

    expect(chromeMock.chrome.storage.sync.set).toHaveBeenCalledTimes(2);
    expect(chromeMock.pendingSetCount()).toBe(1);

    chromeMock.flushAllSets();
    await secondSave;

    expect(backingStore[STORAGE_KEY]).toEqual({
      birthday: '1990-01-01',
      journals: { 1: ['second', '', ''] },
    });
    await expect(service.getUserData()).resolves.toEqual({
      birthday: '1990-01-01',
      journals: { 1: ['second', '', ''] },
    });
  });
});
