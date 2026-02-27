import { hashText, validateLength } from './_lib';

const PROMPT = `Improve document section readability while preserving meaning. Return JSON with keys: enhancedHtml, summary, takeaways, glossary.`;
const cache = new Map<string, any>();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sectionHtml, title } = req.body || {};
  if (!validateLength(sectionHtml, 50000)) return res.status(400).json({ error: 'Invalid payload' });

  const key = hashText(`${title}:${sectionHtml}`);
  if (cache.has(key)) return res.status(200).json(cache.get(key));

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    const fallback = { enhancedHtml: sectionHtml, summary: sectionHtml.replace(/<[^>]+>/g, ' ').slice(0, 240), takeaways: [], glossary: [] };
    cache.set(key, fallback);
    return res.status(200).json(fallback);
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `Title: ${title || 'Document'}\n${sectionHtml}` },
        ],
      }),
    });
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const result = {
      enhancedHtml: parsed.enhancedHtml || sectionHtml,
      summary: parsed.summary || '',
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
    };
    cache.set(key, result);
    return res.status(200).json(result);
  } catch {
    return res.status(200).json({ enhancedHtml: sectionHtml, summary: '', takeaways: [], glossary: [] });
  }
}
