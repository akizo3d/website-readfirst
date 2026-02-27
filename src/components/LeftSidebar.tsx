import type { HeadingItem, SavedReading } from '../lib/types';

interface LeftSidebarProps {
  headings: HeadingItem[];
  isOpen: boolean;
  onToggle: () => void;
  labels: {
    mainMenu: string;
    hide: string;
    show: string;
    content: string;
    savedReadings: string;
    openSaved: string;
    rename: string;
    delete: string;
    noSaved: string;
    uploadDate: string;
    lastOpened: string;
  };
  savedReadings: SavedReading[];
  onOpenSaved: (id: string) => void;
  onRenameSaved: (id: string) => void;
  onDeleteSaved: (id: string) => void;
}

export function LeftSidebar({
  headings,
  isOpen,
  onToggle,
  labels,
  savedReadings,
  onOpenSaved,
  onRenameSaved,
  onDeleteSaved,
}: LeftSidebarProps) {
  return (
    <aside className={`left-sidebar ${isOpen ? 'open' : 'closed'}`} aria-label={labels.mainMenu}>
      <div className="sidebar-head">
        <h2>{labels.mainMenu}</h2>
        <button type="button" onClick={onToggle} className="sidebar-toggle">
          {isOpen ? labels.hide : labels.show}
        </button>
      </div>

      <div className="sidebar-scroll">
        <h3>{labels.content}</h3>
        <ul className="toc-list">
          {headings.map((heading) => (
            <li key={heading.id} className={`l${heading.level}`}>
              <a href={`#${heading.id}`}>{heading.text}</a>
            </li>
          ))}
        </ul>

        <h3>{labels.savedReadings}</h3>
        {savedReadings.length === 0 && <p className="small-muted">{labels.noSaved}</p>}
        <ul className="saved-list">
          {savedReadings.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <small>{labels.uploadDate}: {new Date(item.createdAt).toLocaleDateString()}</small>
              <small>{labels.lastOpened}: {new Date(item.lastOpenedAt).toLocaleDateString()}</small>
              {item.tags?.length ? <small>#{item.tags.join(' #')}</small> : null}
              <div className="saved-actions">
                <button type="button" onClick={() => onOpenSaved(item.id)}>{labels.openSaved}</button>
                <button type="button" onClick={() => onRenameSaved(item.id)}>{labels.rename}</button>
                <button type="button" onClick={() => onDeleteSaved(item.id)}>{labels.delete}</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
