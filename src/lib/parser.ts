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

  article.querySelectorAll('img').forEach((img) => {
    if (!img.closest('figure')) {
      const figure = doc.createElement('figure');
      img.parentNode?.insertBefore(figure, img);
      figure.appendChild(img);
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('data-readerfirst-image', '1');
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', 'Document image');
    }
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
    ADD_TAGS: ['figure', 'figcaption'],
    ADD_ATTR: ['loading', 'data-readerfirst-image'],
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
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(async (image: { read: (kind: 'base64') => Promise<string>; contentType: string; altText?: string }) => {
        const base64 = await image.read('base64');
        return {
          src: `data:${image.contentType};base64,${base64}`,
          alt: image.altText || 'Document image',
        };
      }),
    },
  );

  return normalizeHtml(value, file.name.replace(/\.docx$/i, ''));
}

async function renderPageAsImage(page: pdfjsLib.PDFPageProxy) {
  const viewport = page.getViewport({ scale: 1.2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.75);
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

    const pageImg = await renderPageAsImage(page);
    if (pageImg) {
      pages.push(`<figure><img src="${pageImg}" alt="Page ${i} image" data-page="${i}" loading="lazy" /></figure>`);
    }
  }

  if (!pages.length) {
    pages.push('<blockquote>This PDF appears to have no selectable text. It may be scanned/image-only. Use OCR before importing.</blockquote>');
  }

  return normalizeHtml(`<h1>${file.name.replace(/\.pdf$/i, '')}</h1>${pages.join('')}`, file.name.replace(/\.pdf$/i, ''));
}
