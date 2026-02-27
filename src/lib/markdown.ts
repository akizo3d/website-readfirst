import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { ParsedDocument } from './types';
import { buildHeadingsFromHtml } from './enhancement';

export function markdownToParsedDocument(markdown: string, title = 'Markdown Document'): ParsedDocument {
  const rawHtml = marked.parse(markdown) as string;
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['figure', 'figcaption'],
  });
  const headings = buildHeadingsFromHtml(cleanHtml);
  const doc = new DOMParser().parseFromString(`<article>${cleanHtml}</article>`, 'text/html');
  const textChunks: string[] = [];
  doc.querySelectorAll('p, li, blockquote, h1, h2, h3').forEach((node) => {
    const text = node.textContent?.trim();
    if (text) {
      textChunks.push(text);
      node.setAttribute('data-chunk', String(textChunks.length - 1));
    }
  });

  return {
    id: crypto.randomUUID(),
    title: headings[0]?.text || title,
    sourceLanguage: 'original',
    html: doc.body.firstElementChild?.innerHTML ?? cleanHtml,
    headings,
    textChunks,
  };
}
