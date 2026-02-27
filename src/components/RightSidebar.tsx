import type { Dispatch, SetStateAction } from 'react';
import type { ReaderSettings } from '../lib/types';

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: ReaderSettings;
  setSettings: Dispatch<SetStateAction<ReaderSettings>>;
  mode: 'original' | 'pt-BR';
  setMode: Dispatch<SetStateAction<'original' | 'pt-BR'>>;
  onTranslate: () => void;
  translating: boolean;
  progress: number;
  translatedReady: boolean;
  query: string;
  onSearch: (term: string) => void;
  hits: number;
  translationError: string;
  labels: {
    appearance: string;
    hide: string;
    show: string;
    searchInText: string;
    searchPlaceholder: string;
    results: string;
    theme: string;
    dark: string;
    light: string;
    sepia: string;
    fontSize: string;
    lineHeight: string;
    paragraphSpacing: string;
    horizontalPadding: string;
    verticalPadding: string;
    textWidth: string;
    standard: string;
    wide: string;
    distractionFree: string;
    original: string;
    translatePtBr: string;
    showPtBr: string;
    translating: string;
  };
}

export function RightSidebar({
  isOpen,
  onToggle,
  settings,
  setSettings,
  mode,
  setMode,
  onTranslate,
  translating,
  progress,
  translatedReady,
  query,
  onSearch,
  hits,
  translationError,
  labels,
}: RightSidebarProps) {
  return (
    <aside className={`right-sidebar ${isOpen ? 'open' : 'closed'}`} aria-label={labels.appearance}>
      <div className="sidebar-head">
        <h2>{labels.appearance}</h2>
        <button type="button" onClick={onToggle} className="sidebar-toggle">
          {isOpen ? labels.hide : labels.show}
        </button>
      </div>

      <div className="sidebar-scroll">
        <label>
          {labels.searchInText}
          <input type="search" value={query} onChange={(e) => onSearch(e.target.value)} placeholder={labels.searchPlaceholder} />
        </label>
        <small>{hits} {labels.results}</small>

        <label>
          {labels.theme}
          <select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as ReaderSettings['theme'] }))}>
            <option value="dark">{labels.dark}</option>
            <option value="light">{labels.light}</option>
            <option value="sepia">{labels.sepia}</option>
          </select>
        </label>

        {[
          ['fontSize', labels.fontSize, 14, 30, 1],
          ['lineHeight', labels.lineHeight, 1.3, 2.2, 0.05],
          ['paragraphSpacing', labels.paragraphSpacing, 0.6, 2.4, 0.1],
          ['horizontalPadding', labels.horizontalPadding, 12, 100, 1],
          ['verticalPadding', labels.verticalPadding, 12, 80, 1],
        ].map(([key, label, min, max, step]) => (
          <label key={key}>
            {label}
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

        <label>
          {labels.textWidth}
          <select
            value={settings.maxWidthCh > 72 ? 'wide' : 'standard'}
            onChange={(e) => setSettings((s) => ({ ...s, maxWidthCh: e.target.value === 'wide' ? 80 : 68 }))}
          >
            <option value="standard">{labels.standard}</option>
            <option value="wide">{labels.wide}</option>
          </select>
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={settings.distractionFree}
            onChange={(e) => setSettings((s) => ({ ...s, distractionFree: e.target.checked }))}
          />
          {labels.distractionFree}
        </label>

        <hr />
        <button onClick={() => setMode('original')} className={mode === 'original' ? 'active' : ''}>{labels.original}</button>
        <button onClick={onTranslate} disabled={translating}>{translating ? `${labels.translating} ${progress}%` : labels.translatePtBr}</button>
        <button onClick={() => setMode('pt-BR')} disabled={!translatedReady}>{labels.showPtBr}</button>
        {translationError && <p className="error">{translationError}</p>}
      </div>
    </aside>
  );
}
