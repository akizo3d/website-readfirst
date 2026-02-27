import type { UiLanguage, VisionCaptionConfig } from './types';

async function captionWithOpenAI(imageDataUrl: string, cfg: VisionCaptionConfig, lang: UiLanguage) {
  const langPrompt = lang === 'pt-BR' ? 'Brazilian Portuguese' : 'English';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Create a short natural ${langPrompt} caption for this document image.` },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 80,
    }),
  });
  if (!res.ok) {
    throw new Error(`Caption API failed: ${res.status}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || (lang === 'pt-BR' ? 'Imagem do documento' : 'Document image');
}

export async function enrichImagesWithCaptions(html: string, cfg: VisionCaptionConfig | null) {
  if (!cfg?.apiKey) {
    return html;
  }
  const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html');
  const images = Array.from(doc.querySelectorAll('img[data-readerfirst-image="1"]'));

  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src?.startsWith('data:image')) continue;
    try {
      const [enCaption, ptCaption] = await Promise.all([
        captionWithOpenAI(src, cfg, 'en'),
        captionWithOpenAI(src, cfg, 'pt-BR'),
      ]);

      img.setAttribute('alt', enCaption);
      img.setAttribute('data-alt-en', enCaption);
      img.setAttribute('data-alt-pt', ptCaption);

      let fig = img.closest('figure');
      if (!fig) {
        fig = doc.createElement('figure');
        img.parentElement?.insertBefore(fig, img);
        fig.appendChild(img);
      }

      if (!fig.querySelector('figcaption')) {
        const cap = doc.createElement('figcaption');
        cap.textContent = enCaption;
        cap.setAttribute('data-cap-en', enCaption);
        cap.setAttribute('data-cap-pt', ptCaption);
        fig.appendChild(cap);
      }
    } catch {
      // keep image without generated caption on errors
    }
  }

  return doc.body.firstElementChild?.innerHTML ?? html;
}

export function applyImageLocale(html: string, lang: UiLanguage) {
  const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html');
  doc.querySelectorAll('img[data-readerfirst-image="1"]').forEach((img) => {
    const localized = img.getAttribute(lang === 'pt-BR' ? 'data-alt-pt' : 'data-alt-en');
    if (localized) img.setAttribute('alt', localized);
  });
  doc.querySelectorAll('figcaption').forEach((cap) => {
    const localized = cap.getAttribute(lang === 'pt-BR' ? 'data-cap-pt' : 'data-cap-en');
    if (localized) cap.textContent = localized;
  });
  return doc.body.firstElementChild?.innerHTML ?? html;
}
