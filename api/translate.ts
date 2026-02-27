import { hashText, validateLength } from './_lib';

const cache = new Map<string, string>();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { text } = req.body || {};
  if (!validateLength(text, 14000)) return res.status(400).json({ error: 'Invalid text' });
  const key = hashText(text);
  if (cache.has(key)) return res.status(200).json({ text: cache.get(key) });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return res.status(200).json({ text });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Translate to natural pt-BR preserving technical terms and structure.' },
          { role: 'user', content: text },
        ],
      }),
    });
    const data = await r.json();
    const out = data.choices?.[0]?.message?.content?.trim() || text;
    cache.set(key, out);
    return res.status(200).json({ text: out });
  } catch {
    return res.status(200).json({ text });
  }
}
