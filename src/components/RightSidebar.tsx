import type { Dispatch, SetStateAction } from 'react';
import type { ReaderSettings, StudyFlashcard, StudyQuizItem } from '../lib/types';

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: ReaderSettings;
  setSettings: Dispatch<SetStateAction<ReaderSettings>>;
  query: string;
  onSearch: (term: string) => void;
  hits: number;
  labels: Record<string, string>;
  question: string;
  onQuestionChange: (value: string) => void;
  onAsk: () => void;
  answer: string;
  onGenerateFlashcards: () => void;
  flashcards: StudyFlashcard[];
  onGenerateQuiz: () => void;
  quiz: StudyQuizItem[];
}

export function RightSidebar({
  isOpen,
  onToggle,
  settings,
  setSettings,
  query,
  onSearch,
  hits,
  labels,
  question,
  onQuestionChange,
  onAsk,
  answer,
  onGenerateFlashcards,
  flashcards,
  onGenerateQuiz,
  quiz,
}: RightSidebarProps) {
  return (
    <aside className={`right-sidebar ${isOpen ? 'open' : 'closed'}`} aria-label={labels.appearance}>
      <div className="sidebar-head">
        <h2>{labels.appearance}</h2>
        <button type="button" onClick={onToggle} className="sidebar-toggle">{isOpen ? labels.hide : labels.show}</button>
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
          <select value={settings.maxWidthCh > 72 ? 'wide' : 'standard'} onChange={(e) => setSettings((s) => ({ ...s, maxWidthCh: e.target.value === 'wide' ? 80 : 68 }))}>
            <option value="standard">{labels.standard}</option>
            <option value="wide">{labels.wide}</option>
          </select>
        </label>

        <label className="row">
          <input type="checkbox" checked={settings.distractionFree} onChange={(e) => setSettings((s) => ({ ...s, distractionFree: e.target.checked }))} />
          {labels.distractionFree}
        </label>

        <section className="study-panel">
          <h3>{labels.study}</h3>
          <label>
            {labels.askQuestion}
            <input value={question} onChange={(e) => onQuestionChange(e.target.value)} placeholder={labels.searchPlaceholder} />
          </label>
          <button type="button" onClick={onAsk}>{labels.ask}</button>
          {answer && <p><strong>{labels.answer}:</strong> {answer}</p>}

          <div className="study-actions">
            <button type="button" onClick={onGenerateFlashcards}>{labels.generate} {labels.flashcards}</button>
            <button type="button" onClick={onGenerateQuiz}>{labels.generate} {labels.quiz}</button>
          </div>

          {flashcards.length > 0 && (
            <ul className="study-list">
              {flashcards.slice(0, 6).map((f, idx) => <li key={`f-${idx}`}><strong>{f.front}</strong><p>{f.back}</p></li>)}
            </ul>
          )}

          {quiz.length > 0 && (
            <ul className="study-list">
              {quiz.slice(0, 4).map((q, idx) => <li key={`q-${idx}`}><strong>{q.question}</strong><p>{q.answer}</p></li>)}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
