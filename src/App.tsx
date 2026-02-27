import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import type { ParsedDocument, ReaderSettings, TranslationProviderConfig } from './lib/types';
import { parseDocx, parsePdf } from './lib/parser';
import { settingsStore } from './lib/storage';
import { translateChunk } from './lib/translation';

function replaceChunkText(html: string, translatedChunks: string[]) {
  const doc = new DOMParser().parseFromString(`<article>${html}</article>`, 'text/html');
  doc.querySelectorAll('[data-chunk]').forEach((node) => {
    const idx = Number(node.getAttribute('data-chunk'));
    if (!Number.isNaN(idx) && translatedChunks[idx]) {
      node.textContent = translatedChunks[idx];
    }
  });
  return doc.body.firstElementChild?.innerHTML ?? html;
}

const initialProvider: TranslationProviderConfig = {
  provider: (import.meta.env.VITE_TRANSLATION_PROVIDER as 'openai' | 'deepl') || 'openai',
  apiKey: import.meta.env.VITE_TRANSLATION_API_KEY || '',
  model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
};

export default function App() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [mode, setMode] = useState<'original' | 'pt-BR'>('original');
  const [settings, setSettings] = useState<ReaderSettings>(() => settingsStore.load());
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState(0);
  const [progress, setProgress] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const readerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    settingsStore.save(settings);
  }, [settings]);

  useEffect(() => {
    let timeout: number | undefined;
    const onScroll = () => {
      if (!settings.distractionFree) {
        return;
      }
      setShowTopBar(false);
      clearTimeout(timeout);
      timeout = window.setTimeout(() => setShowTopBar(true), 850);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', () => setShowTopBar(true));
    window.addEventListener('keydown', () => setShowTopBar(true));
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [settings.distractionFree]);

  const articleHtml = mode === 'pt-BR' && translatedHtml ? translatedHtml : doc?.html ?? '';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty('--rf-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--rf-line-height', `${settings.lineHeight}`);
    root.style.setProperty('--rf-width', `${settings.maxWidthCh}ch`);
    root.style.setProperty('--rf-para-space', `${settings.paragraphSpacing}em`);
    root.style.setProperty('--rf-h-pad', `${settings.horizontalPadding}px`);
    root.style.setProperty('--rf-v-pad', `${settings.verticalPadding}px`);
    root.style.setProperty('--rf-letter-spacing', `${settings.letterSpacing}px`);
  }, [settings]);

  const onFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      alert('Use apenas PDF ou DOCX.');
      return;
    }
    setTranslationError('');
    setMode('original');
    setTranslatedHtml('');
    const parsed = extension === 'pdf' ? await parsePdf(file) : await parseDocx(file);
    setDoc(parsed);
  };

  const handleSearch = (term: string) => {
    setQuery(term);
    if (!term.trim()) {
      setHits(0);
      return;
    }
    const clean = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${clean})`, 'gi');
    const count = (articleHtml.match(regex) || []).length;
    setHits(count);
  };

  const highlightedHtml = useMemo(() => {
    if (!query.trim()) {
      return articleHtml;
    }
    const clean = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${clean})`, 'gi');
    return articleHtml.replace(regex, '<mark>$1</mark>');
  }, [articleHtml, query]);

  const progressPct = useMemo(() => {
    const total = document.body.scrollHeight - window.innerHeight;
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (window.scrollY / total) * 100));
  }, [articleHtml]);

  const translate = async () => {
    if (!doc) {
      return;
    }
    if (!initialProvider.apiKey) {
      setTranslationError('Configure VITE_TRANSLATION_API_KEY no .env para habilitar tradução.');
      return;
    }
    setTranslating(true);
    setTranslationError('');
    const translated: string[] = [];

    try {
      for (let i = 0; i < doc.textChunks.length; i += 1) {
        translated[i] = await translateChunk(doc.textChunks[i], initialProvider);
        setProgress(Math.round(((i + 1) / doc.textChunks.length) * 100));
      }
      const html = replaceChunkText(doc.html, translated);
      setTranslatedHtml(html);
      setMode('pt-BR');
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Falha na tradução');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="progress-bar" style={{ width: `${progressPct}%` }} />

      <header className={`topbar ${showTopBar ? '' : 'hidden'}`}>
        <h1>ReaderFirst</h1>
        <div className="actions">
          <label className="upload-btn" aria-label="Selecionar arquivo">
            Upload
            <input type="file" accept=".pdf,.docx" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <button onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen}>Aa</button>
          <button onClick={() => window.print()}>Print A4</button>
        </div>
      </header>

      {!doc && (
        <section
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              void onFile(file);
            }
          }}
        >
          <h2>Upload → Conversão → Leitura</h2>
          <p>Arraste PDF ou DOCX aqui, ou use o botão Upload.</p>
        </section>
      )}

      {doc && (
        <>
          <aside className={`controls ${panelOpen ? 'open' : ''}`}>
            <label>Busca no texto<input type="search" onChange={(e) => handleSearch(e.target.value)} placeholder="Pesquisar..." /></label>
            <small>{hits} resultados</small>
            <label>Tema
              <select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as ReaderSettings['theme'] }))}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="sepia">Sepia</option>
              </select>
            </label>
            {[
              ['fontSize', 'Fonte', 14, 30, 1],
              ['lineHeight', 'Entrelinhas', 1.3, 2.2, 0.05],
              ['maxWidthCh', 'Largura (ch)', 56, 92, 1],
              ['paragraphSpacing', 'Espaço parágrafo', 0.6, 2.4, 0.1],
              ['horizontalPadding', 'Margem horizontal', 12, 100, 1],
              ['verticalPadding', 'Margem vertical', 12, 80, 1],
              ['letterSpacing', 'Espaço letras', -0.2, 1.4, 0.05],
            ].map(([key, label, min, max, step]) => (
              <label key={key}>{label}
                <input
                  type="range"
                  min={Number(min)}
                  max={Number(max)}
                  step={Number(step)}
                  value={settings[key as keyof ReaderSettings] as number}
                  onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
            <label className="row">
              <input type="checkbox" checked={settings.distractionFree} onChange={(e) => setSettings((s) => ({ ...s, distractionFree: e.target.checked }))} />
              Modo sem distração
            </label>

            <hr />
            <button onClick={() => setMode('original')} className={mode === 'original' ? 'active' : ''}>Original</button>
            <button onClick={() => void translate()} disabled={translating}>{translating ? `Traduzindo ${progress}%` : 'Traduzir pt-BR'}</button>
            <button onClick={() => setMode('pt-BR')} disabled={!translatedHtml}>Mostrar pt-BR</button>
            {translationError && <p className="error">{translationError}</p>}
          </aside>

          <nav className="toc" aria-label="Table of contents">
            <h3>Conteúdo</h3>
            <ul>
              {doc.headings.map((heading) => (
                <li key={heading.id} className={`l${heading.level}`}><a href={`#${heading.id}`}>{heading.text}</a></li>
              ))}
            </ul>
          </nav>

          <main className="reader" ref={readerRef}>
            <article dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </main>
        </>
      )}
    </div>
  );
}
