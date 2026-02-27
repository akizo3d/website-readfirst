import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import type { ParsedDocument, ReaderSettings, SavedReading, TranslationProviderConfig, UiLanguage } from './lib/types';
import { parseDocx, parsePdf } from './lib/parser';
import { deleteReading, getDeviceUserId, getReading, listReadingsByUser, saveReading, settingsStore } from './lib/storage';
import { translateChunk } from './lib/translation';
import { LeftSidebar } from './components/LeftSidebar';
import { ReaderContent } from './components/ReaderContent';
import { RightSidebar } from './components/RightSidebar';
import { t, UI_LANG_KEY } from './lib/i18n';
import { applyImageLocale, enrichImagesWithCaptions } from './lib/vision';

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

const visionConfig = {
  apiKey: import.meta.env.VITE_VISION_API_KEY || '',
  model: import.meta.env.VITE_VISION_MODEL || 'gpt-4o-mini',
};

const LEFT_KEY = 'readerfirst-left-open';
const RIGHT_KEY = 'readerfirst-right-open';

export default function App() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState('');
  const [mode, setMode] = useState<'original' | 'pt-BR'>('original');
  const [settings, setSettings] = useState<ReaderSettings>(() => settingsStore.load());
  const [uiLang, setUiLang] = useState<UiLanguage>(() => (localStorage.getItem(UI_LANG_KEY) as UiLanguage) || 'en');
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
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>([]);
  const userId = useMemo(() => getDeviceUserId(), []);

  const labels = useMemo(() => ({
    appName: t(uiLang, 'appName'),
    upload: t(uiLang, 'upload'),
    printA4: t(uiLang, 'printA4'),
    mainMenu: t(uiLang, 'mainMenu'),
    appearance: t(uiLang, 'appearance'),
    savedReadings: t(uiLang, 'savedReadings'),
    content: t(uiLang, 'content'),
    hide: t(uiLang, 'hide'),
    show: t(uiLang, 'show'),
    searchInText: t(uiLang, 'searchInText'),
    searchPlaceholder: t(uiLang, 'searchPlaceholder'),
    results: t(uiLang, 'results'),
    theme: t(uiLang, 'theme'),
    dark: t(uiLang, 'dark'),
    light: t(uiLang, 'light'),
    sepia: t(uiLang, 'sepia'),
    fontSize: t(uiLang, 'fontSize'),
    lineHeight: t(uiLang, 'lineHeight'),
    paragraphSpacing: t(uiLang, 'paragraphSpacing'),
    horizontalPadding: t(uiLang, 'horizontalPadding'),
    verticalPadding: t(uiLang, 'verticalPadding'),
    textWidth: t(uiLang, 'textWidth'),
    standard: t(uiLang, 'standard'),
    wide: t(uiLang, 'wide'),
    distractionFree: t(uiLang, 'distractionFree'),
    original: t(uiLang, 'original'),
    translatePtBr: t(uiLang, 'translatePtBr'),
    showPtBr: t(uiLang, 'showPtBr'),
    translating: t(uiLang, 'translating'),
    configureApiKey: t(uiLang, 'configureApiKey'),
    uploadOnly: t(uiLang, 'uploadOnly'),
    flowTitle: t(uiLang, 'flowTitle'),
    flowText: t(uiLang, 'flowText'),
    openSaved: t(uiLang, 'openSaved'),
    rename: t(uiLang, 'rename'),
    delete: t(uiLang, 'delete'),
    noSaved: t(uiLang, 'noSaved'),
    uploadDate: t(uiLang, 'uploadDate'),
    lastOpened: t(uiLang, 'lastOpened'),
    renamePrompt: t(uiLang, 'renamePrompt'),
    tagsPrompt: t(uiLang, 'tagsPrompt'),
    saveCurrent: t(uiLang, 'saveCurrent'),
    savedOk: t(uiLang, 'savedOk'),
  }), [uiLang]);

  async function reloadSaved() {
    setSavedReadings(await listReadingsByUser(userId));
  }

  useEffect(() => {
    void reloadSaved();
  }, [userId]);

  useEffect(() => {
    settingsStore.save(settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(UI_LANG_KEY, uiLang);
  }, [uiLang]);

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

      if (!settings.distractionFree) return;
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

  const articleHtmlRaw = mode === 'pt-BR' && translatedHtml ? translatedHtml : doc?.html ?? '';
  const articleHtml = useMemo(() => applyImageLocale(articleHtmlRaw, uiLang), [articleHtmlRaw, uiLang]);

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

  async function upsertCurrentReading(nextDoc: ParsedDocument, translated = translatedHtml, idOverride?: string) {
    const now = Date.now();
    const existing = idOverride ? await getReading(idOverride) : undefined;
    const item: SavedReading = {
      id: idOverride || existing?.id || crypto.randomUUID(),
      userId,
      title: nextDoc.title,
      filename: nextDoc.title,
      createdAt: existing?.createdAt || now,
      lastOpenedAt: now,
      tags: existing?.tags || [],
      originalHtml: nextDoc.html,
      translatedHtml: translated || existing?.translatedHtml,
      headings: nextDoc.headings,
      textChunks: nextDoc.textChunks,
      progress: scrollProgress,
    };
    await saveReading(item);
    setDocId(item.id);
    await reloadSaved();
  }

  const onFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      alert(labels.uploadOnly);
      return;
    }
    setTranslationError('');
    setMode('original');
    setTranslatedHtml('');

    const parsed = extension === 'pdf' ? await parsePdf(file) : await parseDocx(file);
    parsed.html = await enrichImagesWithCaptions(parsed.html, visionConfig.apiKey ? visionConfig : null);
    setDoc(parsed);
    await upsertCurrentReading(parsed, '');
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
    if (!query.trim()) return articleHtml;
    const clean = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${clean})`, 'gi');
    return articleHtml.replace(regex, '<mark>$1</mark>');
  }, [articleHtml, query]);

  const translate = async () => {
    if (!doc) return;
    if (!initialProvider.apiKey) {
      setTranslationError(labels.configureApiKey);
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
      const nextTranslated = replaceChunkText(doc.html, translated);
      setTranslatedHtml(nextTranslated);
      setMode('pt-BR');
      await upsertCurrentReading(doc, nextTranslated, docId ?? undefined);
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const openSavedReading = async (id: string) => {
    const item = await getReading(id);
    if (!item) return;
    const parsed: ParsedDocument = {
      id: item.id,
      title: item.title,
      sourceLanguage: 'original',
      html: item.originalHtml,
      headings: item.headings,
      textChunks: item.textChunks,
    };
    setDoc(parsed);
    setDocId(item.id);
    setTranslatedHtml(item.translatedHtml || '');
    setMode('original');
    await saveReading({ ...item, lastOpenedAt: Date.now() });
    await reloadSaved();
  };

  const renameSavedReading = async (id: string) => {
    const item = await getReading(id);
    if (!item) return;
    const nextTitle = window.prompt(labels.renamePrompt, item.title)?.trim();
    if (!nextTitle) return;
    const nextTagsRaw = window.prompt(labels.tagsPrompt, item.tags.join(', ')) ?? '';
    const tags = nextTagsRaw.split(',').map((v) => v.trim()).filter(Boolean);
    await saveReading({ ...item, title: nextTitle, tags, lastOpenedAt: Date.now() });
    await reloadSaved();
    if (docId === id && doc) {
      setDoc({ ...doc, title: nextTitle });
    }
  };

  const removeSavedReading = async (id: string) => {
    await deleteReading(id);
    await reloadSaved();
    if (docId === id) {
      setDoc(null);
      setDocId(null);
      setTranslatedHtml('');
    }
  };

  return (
    <div className="app-shell">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      <header className={`topbar ${showTopBar ? '' : 'hidden'}`}>
        <div className="topbar-left">
          <button type="button" onClick={() => setIsLeftOpen((v) => !v)} aria-label="Toggle Main menu">☰</button>
          <h1>{labels.appName}</h1>
        </div>
        <div className="actions">
          <select className="lang-switcher" value={uiLang} onChange={(e) => setUiLang(e.target.value as UiLanguage)}>
            <option value="en">EN</option>
            <option value="pt-BR">PT-BR</option>
          </select>
          <label className="upload-btn" aria-label="Select file">
            {labels.upload}
            <input type="file" accept=".pdf,.docx" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {doc && <button type="button" onClick={() => doc && void upsertCurrentReading(doc, translatedHtml, docId ?? undefined)}>{labels.saveCurrent}</button>}
          <button type="button" onClick={() => setIsRightOpen((v) => !v)} aria-label="Toggle Appearance">Aa</button>
          <button type="button" onClick={() => window.print()}>{labels.printA4}</button>
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
          <h2>{labels.flowTitle}</h2>
          <p>{labels.flowText}</p>
        </section>
      )}

      <div className="wiki-layout">
        <LeftSidebar
          headings={doc?.headings ?? []}
          isOpen={isLeftOpen}
          onToggle={() => setIsLeftOpen((v) => !v)}
          labels={labels}
          savedReadings={savedReadings}
          onOpenSaved={(id) => void openSavedReading(id)}
          onRenameSaved={(id) => void renameSavedReading(id)}
          onDeleteSaved={(id) => void removeSavedReading(id)}
        />

        {doc && <ReaderContent html={highlightedHtml} />}

        {doc && (
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
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}
