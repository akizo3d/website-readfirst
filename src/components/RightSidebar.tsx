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
}: RightSidebarProps) {
  return (
    <aside className={`right-sidebar ${isOpen ? 'open' : 'closed'}`} aria-label="Appearance">
      <div className="sidebar-head">
        <h2>Appearance</h2>
        <button type="button" onClick={onToggle} className="sidebar-toggle">
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="sidebar-scroll">
        <label>
          Busca no texto
          <input type="search" value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Pesquisar..." />
        </label>
        <small>{hits} resultados</small>

        <label>
          Tema
          <select
            value={settings.theme}
            onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as ReaderSettings['theme'] }))}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
          </select>
        </label>

        {[
          ['fontSize', 'Tamanho da fonte', 14, 30, 1],
          ['lineHeight', 'Line-height', 1.3, 2.2, 0.05],
          ['paragraphSpacing', 'Espaço entre parágrafos', 0.6, 2.4, 0.1],
          ['horizontalPadding', 'Padding horizontal', 12, 100, 1],
          ['verticalPadding', 'Padding vertical', 12, 80, 1],
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
          Largura do texto
          <select
            value={settings.maxWidthCh > 72 ? 'wide' : 'standard'}
            onChange={(e) => setSettings((s) => ({ ...s, maxWidthCh: e.target.value === 'wide' ? 80 : 68 }))}
          >
            <option value="standard">Standard (68ch)</option>
            <option value="wide">Wide (80ch)</option>
          </select>
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={settings.distractionFree}
            onChange={(e) => setSettings((s) => ({ ...s, distractionFree: e.target.checked }))}
          />
          Modo sem distração
        </label>

        <hr />
        <button onClick={() => setMode('original')} className={mode === 'original' ? 'active' : ''}>Original</button>
        <button onClick={onTranslate} disabled={translating}>{translating ? `Traduzindo ${progress}%` : 'Traduzir pt-BR'}</button>
        <button onClick={() => setMode('pt-BR')} disabled={!translatedReady}>Mostrar pt-BR</button>
        {translationError && <p className="error">{translationError}</p>}
      </div>
    </aside>
  );
}
