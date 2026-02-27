import type { SavedReading } from './types';

async function authFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Cloud request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function cloudListReadings(token: string, query = '') {
  return authFetch<{ items: SavedReading[] }>(`/api/library?query=${encodeURIComponent(query)}`, token);
}

export async function cloudUpsertReading(token: string, reading: SavedReading) {
  return authFetch<{ ok: boolean; id: string }>('/api/library', token, {
    method: 'POST',
    body: JSON.stringify({ reading }),
  });
}

export async function cloudDeleteReading(token: string, id: string) {
  return authFetch<{ ok: boolean }>('/api/library', token, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}
