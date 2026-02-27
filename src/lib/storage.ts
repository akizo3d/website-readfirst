import { openDB } from 'idb';
import type { ReaderSettings, SavedReading } from './types';

const SETTINGS_KEY = 'readerfirst-settings';
const DEVICE_ID_KEY = 'readerfirst-device-id';
const DB_NAME = 'readerfirst-db';

const defaultSettings: ReaderSettings = {
  theme: 'dark',
  fontSize: 19,
  lineHeight: 1.72,
  maxWidthCh: 72,
  widthMode: 'standard',
  paragraphSpacing: 1,
  horizontalPadding: 32,
  verticalPadding: 26,
  letterSpacing: 0,
  distractionFree: false,
};

export const settingsStore = {
  load(): ReaderSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(raw) as Partial<ReaderSettings> };
    } catch {
      return defaultSettings;
    }
  },
  save(settings: ReaderSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};

export function getDeviceUserId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

const dbPromise = openDB(DB_NAME, 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('translations')) {
      db.createObjectStore('translations');
    }
    if (!db.objectStoreNames.contains('savedReadings')) {
      const store = db.createObjectStore('savedReadings', { keyPath: 'id' });
      store.createIndex('by-user', 'userId');
      store.createIndex('by-user-lastOpened', ['userId', 'lastOpenedAt']);
    }
  },
});

export async function getTranslationFromCache(cacheKey: string) {
  return (await dbPromise).get('translations', cacheKey) as Promise<string | undefined>;
}

export async function saveTranslationInCache(cacheKey: string, value: string) {
  return (await dbPromise).put('translations', value, cacheKey);
}

export async function saveReading(item: SavedReading) {
  return (await dbPromise).put('savedReadings', item);
}

export async function listReadingsByUser(userId: string) {
  const db = await dbPromise;
  const idx = db.transaction('savedReadings').store.index('by-user');
  const docs = await idx.getAll(userId) as SavedReading[];
  return docs.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function getReading(id: string) {
  return (await dbPromise).get('savedReadings', id) as Promise<SavedReading | undefined>;
}

export async function deleteReading(id: string) {
  return (await dbPromise).delete('savedReadings', id);
}
