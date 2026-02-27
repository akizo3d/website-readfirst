import DOMPurify from 'dompurify';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import type { HeadingItem, ParsedDocument } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function normalizeHtml(raw: string, titleFallback: string): ParsedDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<article>${raw}</article>`, 'text/html');
  const article = doc.body.querySelector('article') as HTMLElement;
  const headings: HeadingItem[] = [];

  article.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const level = Number(heading.tagName.slice(1)) as 1 | 2 | 3;
    const text = heading.textContent?.trim() || 'Section';
    const id = `${slugify(text)}-${headings.length}`;
    heading.id = id;
    headings.push({ id, text, level });
  });

  const textChunks: string[] = [];
  article.querySelectorAll('p, li, blockquote, h1, h2, h3').forEach((node) => {
    const text = node.textContent?.trim();
    if (text) {
      textChunks.push(text);
      node.setAttribute('data-chunk', String(textChunks.length - 1));
    }
  });

  const clean = DOMPurify.sanitize(article.innerHTML, {
    USE_PROFILES: { html: true },
  });

  return {
    id: crypto.randomUUID(),
    title: headings[0]?.text || titleFallback,
    sourceLanguage: 'original',
    html: clean,
    headings,
    textChunks,
  };
}

export async function parseDocx(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml({ arrayBuffer }, {
    includeDefaultStyleMap: true,
  });
  return normalizeHtml(value, file.name.replace(/\.docx$/i, ''));
}

export async function parsePdf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (lines) {
      pages.push(`<p>${lines}</p>`);
    }
  }

  if (!pages.length) {
    pages.push('<blockquote>Este PDF parece não conter texto selecionável. Pode ser um arquivo escaneado (imagem). Use OCR antes da importação.</blockquote>');
  }

  return normalizeHtml(`<h1>${file.name.replace(/\.pdf$/i, '')}</h1>${pages.join('')}`, file.name.replace(/\.pdf$/i, ''));
}
