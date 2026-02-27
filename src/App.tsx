import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './styles.css';
import type { ParsedDocument, ReaderSettings, SavedReading, SourceType, StudyFlashcard, StudyQuizItem, UiLanguage } from './lib/types';
import { parseDocx, parsePdf } from './lib/parser';
import { deleteReading, getDeviceUserId, getReading, listReadingsByUser, saveReading, settingsStore } from './lib/storage';
import { LeftSidebar } from './components/LeftSidebar';
import { ReaderContent } from './components/ReaderContent';
import { RightSidebar } from './components/RightSidebar';
import { t, UI_LANG_KEY } from './lib/i18n';
import { applyImageLocale, enrichImagesWithCaptions } from './lib/vision';
import { buildHeadingsFromHtml, extractGlossaryHits, mergeEnhancedDocument, splitSections } from './lib/enhancement';
import { askDocumentQuestion, enhanceSection, generateFlashcards, generateQuiz } from './lib/aiClient';
import { markdownToParsedDocument } from './lib/markdown';
import { cloudDeleteReading, cloudListReadings, cloudUpsertReading } from './lib/cloudLibrary';
import { supabase } from './lib/auth';

const LEFT_KEY = 'readerfirst-left-open';
const RIGHT_KEY = 'readerfirst-right-open';

type ReadingView = 'raw' | 'enhanced';

function HomePage({ labels }: { labels: Record<string, string> }) {
  return (
    <main className="home-page">
      <h1>{labels.appName}</h1>
      <p className="small-muted">Library with a librarian: intelligent reading + study.</p>
      <div className="home-cards">
        <Link to="/reader" className="home-card"><h2>Reader / Leitor</h2><p>PDF + DOCX intelligent reading flow.</p></Link>
        <Link to="/markdown" className="home-card"><h2>Markdown Converter / Conversor Markdown</h2><p>Paste/upload markdown and read in clean mode.</p></Link>
      </div>
    </main>
  );
}

function ReaderWorkspace({ sourceType }: { sourceType: SourceType }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState('');
  const [enhancedHtml, setEnhancedHtml] = useState('');
  const [mode, setMode] = useState<'original' | 'pt-BR'>('original');
  const [view, setView] = useState<ReadingView>('raw');
  const [enhancementProgress, setEnhancementProgress] = useState('');
  const [settings, setSettings] = useState<ReaderSettings>(() => settingsStore.load());
  const [uiLang, setUiLang] = useState<UiLanguage>(() => (localStorage.getItem(UI_LANG_KEY) as UiLanguage) || 'en');
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTopBar, setShowTopBar] = useState(true);
  const [isLeftOpen, setIsLeftOpen] = useState(() => localStorage.getItem(LEFT_KEY) !== '0');
  const [isRightOpen, setIsRightOpen] = useState(() => localStorage.getItem(RIGHT_KEY) !== '0');
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>([]);
  const [quiz, setQuiz] = useState<StudyQuizItem[]>([]);
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const userId = useMemo(() => getDeviceUserId(), []);

  const labels = useMemo(() => ({
    appName: t(uiLang, 'appName'), upload: t(uiLang, 'upload'), printA4: t(uiLang, 'printA4'), mainMenu: t(uiLang, 'mainMenu'), appearance: t(uiLang, 'appearance'),
    savedReadings: t(uiLang, 'savedReadings'), content: t(uiLang, 'content'), hide: t(uiLang, 'hide'), show: t(uiLang, 'show'), searchInText: t(uiLang, 'searchInText'),
    searchPlaceholder: t(uiLang, 'searchPlaceholder'), results: t(uiLang, 'results'), theme: t(uiLang, 'theme'), dark: t(uiLang, 'dark'), light: t(uiLang, 'light'),
    sepia: t(uiLang, 'sepia'), fontSize: t(uiLang, 'fontSize'), lineHeight: t(uiLang, 'lineHeight'), paragraphSpacing: t(uiLang, 'paragraphSpacing'),
    horizontalPadding: t(uiLang, 'horizontalPadding'), verticalPadding: t(uiLang, 'verticalPadding'), textWidth: t(uiLang, 'textWidth'), standard: t(uiLang, 'standard'),
    wide: t(uiLang, 'wide'), distractionFree: t(uiLang, 'distractionFree'), original: t(uiLang, 'original'), showPtBr: t(uiLang, 'showPtBr'),
    uploadOnly: t(uiLang, 'uploadOnly'), flowTitle: t(uiLang, 'flowTitle'), flowText: t(uiLang, 'flowText'), openSaved: t(uiLang, 'openSaved'),
    rename: t(uiLang, 'rename'), delete: t(uiLang, 'delete'), noSaved: t(uiLang, 'noSaved'), uploadDate: t(uiLang, 'uploadDate'), lastOpened: t(uiLang, 'lastOpened'),
    renamePrompt: t(uiLang, 'renamePrompt'), tagsPrompt: t(uiLang, 'tagsPrompt'), rawView: t(uiLang, 'rawView'), enhancedView: t(uiLang, 'enhancedView'),
    enhanceAi: t(uiLang, 'enhanceAi'), enhancing: t(uiLang, 'enhancing'), study: t(uiLang, 'study'), askQuestion: t(uiLang, 'askQuestion'), ask: t(uiLang, 'ask'),
    answer: t(uiLang, 'answer'), flashcards: t(uiLang, 'flashcards'), quiz: t(uiLang, 'quiz'), generate: t(uiLang, 'generate'),
  }), [uiLang]);

  const baseHtml = mode === 'pt-BR' && translatedHtml ? translatedHtml : doc?.html ?? '';
  const viewedHtml = view === 'enhanced' && enhancedHtml ? enhancedHtml : baseHtml;
  const articleHtml = useMemo(() => applyImageLocale(viewedHtml, uiLang), [viewedHtml, uiLang]);
  const highlightedHtml = useMemo(() => !query.trim() ? articleHtml : articleHtml.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'), [articleHtml, query]);
  const activeHeadings = useMemo(() => buildHeadingsFromHtml(view === 'enhanced' && enhancedHtml ? enhancedHtml : doc?.html ?? ''), [doc?.html, enhancedHtml, view]);
  const contextText = useMemo(() => (doc?.textChunks || []).join('\n').slice(0, 24000), [doc?.textChunks]);

  async function reloadSaved(search = '') {
    if (token) {
      try {
        const { items } = await cloudListReadings(token, search);
        setSavedReadings(items || []);
        return;
      } catch {
        // fallback to local
      }
    }
    const items = await listReadingsByUser(userId);
    setSavedReadings(search ? items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase())) : items);
  }

  useEffect(() => { void reloadSaved(); }, [token, userId]);
  useEffect(() => settingsStore.save(settings), [settings]);
  useEffect(() => localStorage.setItem(UI_LANG_KEY, uiLang), [uiLang]);
  useEffect(() => localStorage.setItem(LEFT_KEY, isLeftOpen ? '1' : '0'), [isLeftOpen]);
  useEffect(() => localStorage.setItem(RIGHT_KEY, isRightOpen ? '1' : '0'), [isRightOpen]);

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

  useEffect(() => {
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(total <= 0 ? 0 : Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
      if (!settings.distractionFree) return;
      setShowTopBar(false);
      window.setTimeout(() => setShowTopBar(true), 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [settings.distractionFree]);

  async function persist(reading: SavedReading) {
    await saveReading(reading);
    if (token) {
      try { await cloudUpsertReading(token, reading); } catch { /* ignore */ }
    }
  }

  async function upsertCurrentReading(nextDoc: ParsedDocument, override?: Partial<SavedReading>) {
    const now = Date.now();
    const existing = docId ? await getReading(docId) : undefined;
    const item: SavedReading = {
      id: existing?.id || crypto.randomUUID(),
      userId,
      title: override?.title || nextDoc.title,
      filename: nextDoc.title,
      sourceType,
      createdAt: existing?.createdAt || now,
      lastOpenedAt: now,
      tags: override?.tags || existing?.tags || [],
      originalHtml: nextDoc.html,
      translatedHtml: override?.translatedHtml ?? translatedHtml ?? existing?.translatedHtml,
      enhancedHtml: override?.enhancedHtml ?? enhancedHtml ?? existing?.enhancedHtml,
      headings: nextDoc.headings,
      enhancedHeadings: override?.enhancedHeadings ?? existing?.enhancedHeadings,
      textChunks: nextDoc.textChunks,
      progress: scrollProgress,
      flashcards: override?.flashcards ?? flashcards ?? existing?.flashcards,
      quiz: override?.quiz ?? quiz ?? existing?.quiz,
    };
    await persist(item);
    setDocId(item.id);
    await reloadSaved();
  }

  const onFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') return alert(labels.uploadOnly);
    const parsed = extension === 'pdf' ? await parsePdf(file) : await parseDocx(file);
    parsed.html = await enrichImagesWithCaptions(parsed.html, null);
    setDoc(parsed);
    setTranslatedHtml('');
    setEnhancedHtml('');
    setView('raw');
    setMode('original');
    await upsertCurrentReading(parsed, { sourceType: extension as SourceType });
  };

  const onMarkdown = async (markdown: string, title = 'Markdown') => {
    const parsed = markdownToParsedDocument(markdown, title);
    setDoc(parsed);
    setTranslatedHtml('');
    setEnhancedHtml('');
    setView('raw');
    setMode('original');
    await upsertCurrentReading(parsed, { sourceType: 'markdown' });
  };

  const translate = async () => {
    if (!doc) return;
    const translated: string[] = [];
    for (let i = 0; i < doc.textChunks.length; i += 1) {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: doc.textChunks[i] }) });
      const data = await res.json() as { text: string };
      translated[i] = data.text || doc.textChunks[i];
    }
    const next = (() => {
      const d = new DOMParser().parseFromString(`<article>${doc.html}</article>`, 'text/html');
      d.querySelectorAll('[data-chunk]').forEach((node) => {
        const idx = Number(node.getAttribute('data-chunk'));
        if (!Number.isNaN(idx) && translated[idx]) node.textContent = translated[idx];
      });
      return d.body.firstElementChild?.innerHTML || doc.html;
    })();
    setTranslatedHtml(next);
    setMode('pt-BR');
    await upsertCurrentReading(doc, { translatedHtml: next });
  };

  const runEnhancement = async () => {
    if (!doc) return;
    if (enhancedHtml) return setView('enhanced');
    const sections = splitSections(baseHtml);
    const output: string[] = [];
    const takeaways: string[] = [];
    const glossary = new Set<string>();
    let summary = '';
    for (let i = 0; i < sections.length; i += 1) {
      setEnhancementProgress(`${labels.enhancing} ${i + 1}/${sections.length}`);
      const result = await enhanceSection(sections[i], doc.title);
      output.push(result.enhancedHtml);
      if (!summary && result.summary) summary = result.summary;
      (result.takeaways || []).forEach((t) => takeaways.push(t));
      (result.glossary || []).forEach((g) => glossary.add(g));
      extractGlossaryHits(sections[i]).forEach((g) => glossary.add(g));
    }
    const merged = mergeEnhancedDocument(output, summary, takeaways.slice(0, 6), Array.from(glossary));
    setEnhancedHtml(merged);
    setView('enhanced');
    setEnhancementProgress('');
    await upsertCurrentReading(doc, { enhancedHtml: merged, enhancedHeadings: buildHeadingsFromHtml(merged) });
  };

  const openSavedReading = async (id: string) => {
    const item = await getReading(id);
    if (!item) return;
    setDocId(item.id);
    setDoc({ id: item.id, title: item.title, sourceLanguage: 'original', html: item.originalHtml, headings: item.headings, textChunks: item.textChunks });
    setTranslatedHtml(item.translatedHtml || '');
    setEnhancedHtml(item.enhancedHtml || '');
    setFlashcards(item.flashcards || []);
    setQuiz(item.quiz || []);
    setMode('original');
    setView('raw');
    await persist({ ...item, lastOpenedAt: Date.now() });
    await reloadSaved();
  };

  const renameSavedReading = async (id: string) => {
    const item = await getReading(id);
    if (!item) return;
    const nextTitle = window.prompt(labels.renamePrompt, item.title)?.trim();
    if (!nextTitle) return;
    const tagsRaw = window.prompt(labels.tagsPrompt, item.tags.join(', ')) ?? '';
    const next = { ...item, title: nextTitle, tags: tagsRaw.split(',').map((v) => v.trim()).filter(Boolean) };
    await persist(next);
    if (docId === id && doc) setDoc({ ...doc, title: nextTitle });
    await reloadSaved();
  };

  const removeSavedReading = async (id: string) => {
    await deleteReading(id);
    if (token) await cloudDeleteReading(token, id).catch(() => undefined);
    await reloadSaved();
    if (docId === id) {
      setDoc(null);
      setDocId(null);
      setTranslatedHtml('');
      setEnhancedHtml('');
    }
  };

  const login = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await supabase.auth.signUp({ email, password });
    }
    const { data } = await supabase.auth.getSession();
    setToken(data.session?.access_token || '');
    await reloadSaved();
  };

  const askQuestionAction = async () => { if (question.trim()) setAnswer((await askDocumentQuestion(question, contextText)).answer); };
  const generateFlashcardsAction = async () => { const data = await generateFlashcards(contextText); setFlashcards(data.flashcards); if (doc) await upsertCurrentReading(doc, { flashcards: data.flashcards }); };
  const generateQuizAction = async () => { const data = await generateQuiz(contextText); setQuiz(data.quiz); if (doc) await upsertCurrentReading(doc, { quiz: data.quiz }); };

  return (
    <div className="app-shell">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      <header className={`topbar ${showTopBar ? '' : 'hidden'}`}>
        <div className="topbar-left">
          <button type="button" onClick={() => setIsLeftOpen((v) => !v)} aria-label="Toggle Main menu">☰</button>
          <h1>{labels.appName}</h1>
          <button type="button" onClick={() => navigate('/')}>Home</button>
        </div>
        <div className="actions">
          <select className="lang-switcher" value={uiLang} onChange={(e) => setUiLang(e.target.value as UiLanguage)}><option value="en">EN</option><option value="pt-BR">PT-BR</option></select>
          <label className="upload-btn">{labels.upload}<input type="file" accept={sourceType === 'markdown' ? '.md,.txt' : '.pdf,.docx'} hidden onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (sourceType === 'markdown') {
              const text = await file.text();
              await onMarkdown(text, file.name);
            } else {
              await onFile(file);
            }
          }} /></label>
          {doc && <button type="button" onClick={() => setView('raw')} className={view === 'raw' ? 'is-active' : ''}>{labels.rawView}</button>}
          {doc && <button type="button" onClick={() => setView('enhanced')} disabled={!enhancedHtml} className={view === 'enhanced' ? 'is-active' : ''}>{labels.enhancedView}</button>}
          {doc && <button type="button" onClick={() => void runEnhancement()}>{labels.enhanceAi}</button>}
          {doc && <button type="button" onClick={() => setMode('original')} className={mode === 'original' ? 'is-active' : ''}>{labels.original}</button>}
          {doc && <button type="button" onClick={() => void translate()}>{labels.showPtBr}</button>}
          <button type="button" onClick={() => setIsRightOpen((v) => !v)} aria-label="Toggle Appearance">Aa</button>
          <button type="button" onClick={() => window.print()}>{labels.printA4}</button>
        </div>
      </header>

      {!token && supabase && (
        <div className="auth-strip">
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => void login()}>Cloud login</button>
        </div>
      )}

      {!doc && (
        <section className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          if (sourceType === 'markdown') await onMarkdown(await file.text(), file.name);
          else await onFile(file);
        }}>
          <h2>{sourceType === 'markdown' ? 'Markdown Converter' : labels.flowTitle}</h2>
          <p>{sourceType === 'markdown' ? 'Paste or upload markdown to build a reading-first page.' : labels.flowText}</p>
          {sourceType === 'markdown' && <MarkdownComposer onConvert={onMarkdown} />}
        </section>
      )}

      {enhancementProgress && <p className="enhancement-progress">{enhancementProgress}</p>}

      <div className="wiki-layout">
        <LeftSidebar headings={activeHeadings} isOpen={isLeftOpen} onToggle={() => setIsLeftOpen((v) => !v)} labels={labels} savedReadings={savedReadings} onOpenSaved={(id) => void openSavedReading(id)} onRenameSaved={(id) => void renameSavedReading(id)} onDeleteSaved={(id) => void removeSavedReading(id)} />
        {doc && <ReaderContent html={highlightedHtml} />}
        {doc && <RightSidebar isOpen={isRightOpen} onToggle={() => setIsRightOpen((v) => !v)} settings={settings} setSettings={setSettings} query={query} onSearch={(term) => { setQuery(term); setHits(term ? (articleHtml.match(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')) || []).length : 0); }} hits={hits} labels={labels} question={question} onQuestionChange={setQuestion} onAsk={() => void askQuestionAction()} answer={answer} onGenerateFlashcards={() => void generateFlashcardsAction()} flashcards={flashcards} onGenerateQuiz={() => void generateQuizAction()} quiz={quiz} />}
      </div>
    </div>
  );
}

function MarkdownComposer({ onConvert }: { onConvert: (markdown: string, title?: string) => Promise<void> }) {
  const [value, setValue] = useState('# Markdown\n\nWrite or paste your content here.');
  const [title, setTitle] = useState('Markdown Document');
  return (
    <div className="markdown-composer">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <textarea rows={10} value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" onClick={() => void onConvert(value, title)}>Convert Markdown</button>
    </div>
  );
}

export default function App() {
  const lang = (localStorage.getItem(UI_LANG_KEY) as UiLanguage) || 'en';
  const labels = {
    appName: t(lang, 'appName'),
  } as Record<string, string>;

  return (
    <Routes>
      <Route path="/" element={<HomePage labels={labels} />} />
      <Route path="/reader" element={<ReaderWorkspace sourceType="pdf" />} />
      <Route path="/markdown" element={<ReaderWorkspace sourceType="markdown" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
