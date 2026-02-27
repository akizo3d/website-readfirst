import { validateLength } from './_lib';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mode, question, context } = req.body || {};
  if (!validateLength(context || 'x', 70000)) return res.status(400).json({ error: 'Context too large' });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    if (mode === 'qa') return res.status(200).json({ answer: `Fallback answer for: ${question}` });
    if (mode === 'flashcards') return res.status(200).json({ flashcards: [{ front: 'Key point', back: (context || '').slice(0, 120) }] });
    return res.status(200).json({ quiz: [{ question: 'Main idea?', answer: (context || '').slice(0, 100) }] });
  }

  const prompt = mode === 'qa'
    ? `Answer using only this document context. Return JSON {"answer": string}. Context:\n${context}\nQuestion:${question}`
    : mode === 'flashcards'
      ? `Create 10-30 flashcards from this context. Return JSON {"flashcards": [{"front": string, "back": string}]}.\n${context}`
      : `Create a quiz from this context. Return JSON {"quiz": [{"question": string, "options": string[], "answer": string}]}.\n${context}`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    if (mode === 'qa') return res.status(200).json({ answer: parsed.answer || '' });
    if (mode === 'flashcards') return res.status(200).json({ flashcards: parsed.flashcards || [] });
    return res.status(200).json({ quiz: parsed.quiz || [] });
  } catch {
    return res.status(500).json({ error: 'Study request failed' });
  }
}
