function fallbackQA(question: string) {
  return { answer: `I could not call the AI provider. Question received: ${question}` };
}

function fallbackFlashcards(context: string) {
  const lines = context.split(/[.!?]\s+/).filter(Boolean).slice(0, 12);
  return { flashcards: lines.map((line, i) => ({ front: `Key point ${i + 1}`, back: line.slice(0, 180) })) };
}

function fallbackQuiz(context: string) {
  const first = context.split(/[.!?]\s+/).find(Boolean) || 'Document topic';
  return {
    quiz: [
      {
        question: 'What is the main topic of this document?',
        answer: first.slice(0, 120),
      },
    ],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { mode, question, context } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    if (mode === 'qa') return res.status(200).json(fallbackQA(question || ''));
    if (mode === 'flashcards') return res.status(200).json(fallbackFlashcards(context || ''));
    return res.status(200).json(fallbackQuiz(context || ''));
  }

  const prompts: Record<string, string> = {
    qa: `Answer using only this document context.\nContext:\n${context}\nQuestion:${question}\nReturn JSON: {"answer": string}`,
    flashcards: `Create 10 to 20 concise study flashcards from this context. Return JSON: {"flashcards": [{"front": string, "back": string}]}.\n${context}`,
    quiz: `Create a short quiz (mcq + short answer) from this context. Return JSON: {"quiz": [{"question": string, "options": string[], "answer": string}]}.\n${context}`,
  };

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
        messages: [{ role: 'user', content: prompts[mode] || prompts.quiz }],
      }),
    });

    if (!response.ok) {
      throw new Error('provider failed');
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    if (mode === 'qa') return res.status(200).json({ answer: parsed.answer || '' });
    if (mode === 'flashcards') return res.status(200).json({ flashcards: parsed.flashcards || [] });
    return res.status(200).json({ quiz: parsed.quiz || [] });
  } catch {
    if (mode === 'qa') return res.status(200).json(fallbackQA(question || ''));
    if (mode === 'flashcards') return res.status(200).json(fallbackFlashcards(context || ''));
    return res.status(200).json(fallbackQuiz(context || ''));
  }
}
