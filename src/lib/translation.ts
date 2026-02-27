import { getTranslationFromCache, saveTranslationInCache } from './storage';
import type { TranslationProviderConfig } from './types';

const GLOSSARY: Record<string, string> = {
  topology: 'topology',
  retopology: 'retopology',
  'edge loop': 'edge loop',
  UV: 'UV',
  rig: 'rig',
  skinning: 'skinning',
  'normal map': 'normal map',
  PBR: 'PBR',
};

function applyGlossaryGuard(text: string) {
  let guarded = text;
  Object.entries(GLOSSARY).forEach(([term, forced]) => {
    const token = `__TERM_${term.replace(/\W+/g, '_').toUpperCase()}__`;
    guarded = guarded.replace(new RegExp(term, 'gi'), token);
    guarded = guarded.replace(new RegExp(token, 'g'), forced);
  });
  return guarded;
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

async function translateOpenAI(chunk: string, cfg: TranslationProviderConfig) {
  const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Translate to natural Brazilian Portuguese while preserving markdown/html inline structure and protected technical terms.',
        },
        {
          role: 'user',
          content: `Translate preserving structure:\n${chunk}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || chunk;
}

async function translateDeepL(chunk: string, cfg: TranslationProviderConfig) {
  const params = new URLSearchParams({
    auth_key: cfg.apiKey,
    target_lang: 'PT-BR',
    text: chunk,
    preserve_formatting: '1',
  });

  const res = await fetchWithRetry('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await res.json() as { translations?: { text: string }[] };
  return data.translations?.[0]?.text || chunk;
}

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

export async function translateChunk(chunk: string, cfg: TranslationProviderConfig) {
  const guardedChunk = applyGlossaryGuard(chunk);
  const cacheKey = `${cfg.provider}:${hash(guardedChunk)}`;
  const cached = await getTranslationFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const translated = cfg.provider === 'deepl'
    ? await translateDeepL(guardedChunk, cfg)
    : await translateOpenAI(guardedChunk, cfg);

  await saveTranslationInCache(cacheKey, translated);
  return translated;
}
