import type { StudyFlashcard, StudyQuizItem } from './types';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function enhanceSection(sectionHtml: string, title: string) {
  return post<{ enhancedHtml: string; summary?: string; takeaways?: string[]; glossary?: string[] }>(
    '/api/ai/enhance',
    { sectionHtml, title },
  );
}

export async function askDocumentQuestion(question: string, context: string) {
  return post<{ answer: string }>('/api/ai/study', { mode: 'qa', question, context });
}

export async function generateFlashcards(context: string) {
  return post<{ flashcards: StudyFlashcard[] }>('/api/ai/study', { mode: 'flashcards', context });
}

export async function generateQuiz(context: string) {
  return post<{ quiz: StudyQuizItem[] }>('/api/ai/study', { mode: 'quiz', context });
}
