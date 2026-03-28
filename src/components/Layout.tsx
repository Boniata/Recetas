import type { ReactNode } from 'react';
import type { Page } from '../types';

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
}

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'recipes', label: 'Recetas', icon: '📖' },
  { id: 'freezer', label: 'Congelador', icon: '❄️' },
  { id: 'planner', label: 'Planificador', icon: '📅' },
];

export default function Layout({ page, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🍳</span>
          <span className="brand-name">MiCocina</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item${page === n.id ? ' active' : ''}`}
              onClick={() => onNavigate(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
