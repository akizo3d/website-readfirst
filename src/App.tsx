import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import type { ParsedDocument, ReaderSettings, TranslationProviderConfig } from './lib/types';
import { parseDocx, parsePdf } from './lib/parser';
import { settingsStore } from './lib/storage';
import { translateChunk } from './lib/translation';
import { LeftSidebar } from './components/LeftSidebar';
import { ReaderContent } from './components/ReaderContent';
import { RightSidebar } from './components/RightSidebar';

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

const LEFT_KEY = 'readerfirst-left-open';
const RIGHT_KEY = 'readerfirst-right-open';

export default function App() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState('');
  const [mode, setMode] = useState<'original' | 'pt-BR'>('original');
  const [settings, setSettings] = useState<ReaderSettings>(() => settingsStore.load());
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [showTopBar, setShowTopBar] = useState(true);
  const [isLeftOpen, setIsLeftOpen] = useState(() => localStorage.getItem(LEFT_KEY) !== '0');
  const [isRightOpen, setIsRightOpen] = useState(() => localStorage.getItem(RIGHT_KEY) !== '0');

  useEffect(() => {
    settingsStore.save(settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LEFT_KEY, isLeftOpen ? '1' : '0');
  }, [isLeftOpen]);

  useEffect(() => {
    localStorage.setItem(RIGHT_KEY, isRightOpen ? '1' : '0');
  }, [isRightOpen]);

  useEffect(() => {
    let timeout: number | undefined;
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      const pct = total <= 0 ? 0 : Math.min(100, Math.max(0, (window.scrollY / total) * 100));
      setScrollProgress(pct);

      if (!settings.distractionFree) {
        return;
      }
      setShowTopBar(false);
      clearTimeout(timeout);
      timeout = window.setTimeout(() => setShowTopBar(true), 850);
    };

    const onMove = () => setShowTopBar(true);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onMove);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onMove);
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

  const translate = async () => {
    if (!doc) return;
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
      setTranslatedHtml(replaceChunkText(doc.html, translated));
      setMode('pt-BR');
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Falha na tradução');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      <header className={`topbar ${showTopBar ? '' : 'hidden'}`}>
        <div className="topbar-left">
          <button type="button" onClick={() => setIsLeftOpen((v) => !v)} aria-label="Alternar Main menu">☰</button>
          <h1>ReaderFirst</h1>
        </div>
        <div className="actions">
          <label className="upload-btn" aria-label="Selecionar arquivo">
            Upload
            <input type="file" accept=".pdf,.docx" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setIsRightOpen((v) => !v)} aria-label="Alternar Appearance">Aa</button>
          <button type="button" onClick={() => window.print()}>Print A4</button>
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
            if (file) void onFile(file);
          }}
        >
          <h2>Upload → Conversão → Leitura</h2>
          <p>Arraste PDF ou DOCX aqui, ou use o botão Upload.</p>
        </section>
      )}

      {doc && (
        <div className="wiki-layout">
          <LeftSidebar headings={doc.headings} isOpen={isLeftOpen} onToggle={() => setIsLeftOpen((v) => !v)} />
          <ReaderContent html={highlightedHtml} />
          <RightSidebar
            isOpen={isRightOpen}
            onToggle={() => setIsRightOpen((v) => !v)}
            settings={settings}
            setSettings={setSettings}
            mode={mode}
            setMode={setMode}
            onTranslate={() => void translate()}
            translating={translating}
            progress={progress}
            translatedReady={Boolean(translatedHtml)}
            query={query}
            onSearch={handleSearch}
            hits={hits}
            translationError={translationError}
          />
        </div>
      )}
    </div>
  );
}
