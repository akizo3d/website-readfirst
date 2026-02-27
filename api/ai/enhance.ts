const SYSTEM_PROMPT = `You improve document readability while preserving meaning.
Return strict JSON: {"enhancedHtml": string, "summary": string, "takeaways": string[], "glossary": string[] }.
Keep semantic HTML and avoid scripts.`;

function fallback(sectionHtml: string) {
  const plain = sectionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    enhancedHtml: sectionHtml,
    summary: plain.slice(0, 260),
    takeaways: plain ? [plain.slice(0, 120)] : [],
    glossary: [],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { sectionHtml, title } = req.body || {};
  if (!sectionHtml) {
    res.status(400).json({ error: 'Missing sectionHtml' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    res.status(200).json(fallback(sectionHtml));
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Title: ${title || 'Document'}\nSection HTML:\n${sectionHtml}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      res.status(200).json(fallback(sectionHtml));
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');
    res.status(200).json({
      enhancedHtml: parsed.enhancedHtml || sectionHtml,
      summary: parsed.summary || '',
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
    });
  } catch {
    res.status(200).json(fallback(sectionHtml));
  }
}
