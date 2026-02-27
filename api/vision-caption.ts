import { validateLength } from './_lib';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { imageDataUrl, lang = 'en' } = req.body || {};
  if (!validateLength(imageDataUrl, 2_000_000)) return res.status(400).json({ error: 'Invalid image payload' });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return res.status(200).json({ caption: lang === 'pt-BR' ? 'Imagem do documento' : 'Document image' });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [{ type: 'text', text: `Create a short ${lang} caption for this document image.` }, { type: 'image_url', image_url: { url: imageDataUrl } }] }],
        max_tokens: 80,
      }),
    });
    const data = await r.json();
    return res.status(200).json({ caption: data.choices?.[0]?.message?.content?.trim() || '' });
  } catch {
    return res.status(200).json({ caption: '' });
  }
}
