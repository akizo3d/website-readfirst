import { openDB } from 'idb';
import type { ReaderSettings } from './types';

const SETTINGS_KEY = 'readerfirst-settings';
const DB_NAME = 'readerfirst-db';

const defaultSettings: ReaderSettings = {
  theme: 'dark',
  fontSize: 19,
  lineHeight: 1.72,
  maxWidthCh: 72,
  paragraphSpacing: 1,
  horizontalPadding: 32,
  verticalPadding: 26,
  letterSpacing: 0,
  distractionFree: false,
};

export const settingsStore = {
  load(): ReaderSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }
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

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore('translations');
  },
});

export async function getTranslationFromCache(cacheKey: string) {
  return (await dbPromise).get('translations', cacheKey) as Promise<string | undefined>;
}

export async function saveTranslationInCache(cacheKey: string, value: string) {
  return (await dbPromise).put('translations', value, cacheKey);
}
