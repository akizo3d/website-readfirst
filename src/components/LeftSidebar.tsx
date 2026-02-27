import type { HeadingItem } from '../lib/types';

interface LeftSidebarProps {
  headings: HeadingItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export function LeftSidebar({ headings, isOpen, onToggle }: LeftSidebarProps) {
  return (
    <aside className={`left-sidebar ${isOpen ? 'open' : 'closed'}`} aria-label="Main menu">
      <div className="sidebar-head">
        <h2>Main menu</h2>
        <button type="button" onClick={onToggle} className="sidebar-toggle">
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="sidebar-scroll">
        <h3>Conteúdo</h3>
        <ul className="toc-list">
          {headings.map((heading) => (
            <li key={heading.id} className={`l${heading.level}`}>
              <a href={`#${heading.id}`}>{heading.text}</a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
