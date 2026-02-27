import type { HeadingItem } from './types';

export const GLOSSARY_TERMS = [
  'topology',
  'retopology',
  'edge loop',
  'UV',
  'rig',
  'skinning',
  'normal map',
  'PBR',
  'blend shape',
  'baking',
  'albedo',
  'roughness',
];

export function buildHeadingsFromHtml(html: string): HeadingItem[] {
  const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html');
  const headings: HeadingItem[] = [];
  doc.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const level = Number(heading.tagName.slice(1)) as 1 | 2 | 3;
    const text = heading.textContent?.trim() || 'Section';
    const id = `${text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}-${headings.length}`;
    heading.id = id;
    headings.push({ id, text, level });
  });
  return headings;
}

export function splitSections(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html');
  const article = doc.body.firstElementChild as HTMLElement;
  if (!article) return [html];

  const sections: string[] = [];
  let bucket: string[] = [];

  Array.from(article.children).forEach((el) => {
    if (/^H[1-3]$/.test(el.tagName) && bucket.length) {
      sections.push(bucket.join(''));
      bucket = [];
    }
    bucket.push(el.outerHTML);
  });
  if (bucket.length) sections.push(bucket.join(''));
  return sections.length ? sections : [html];
}

export function mergeEnhancedDocument(sectionsHtml: string[], summary: string, takeaways: string[], glossaryFound: string[]) {
  const summaryBlock = `
<section class="ai-summary">
  <h2>Executive Summary</h2>
  <p>${summary}</p>
  ${takeaways.length ? `<h3>Key Takeaways</h3><ul>${takeaways.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
  ${glossaryFound.length ? `<h3>Glossary Focus</h3><p>${glossaryFound.join(', ')}</p>` : ''}
</section>`;
  return `${summaryBlock}${sectionsHtml.join('')}`;
}

export function extractGlossaryHits(text: string) {
  const lower = text.toLowerCase();
  return GLOSSARY_TERMS.filter((term) => lower.includes(term.toLowerCase()));
}
