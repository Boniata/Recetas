import { useState } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(p: Page) {
    onNavigate(p);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
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
              onClick={() => navigate(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <aside className="sidebar sidebar-drawer" onClick={e => e.stopPropagation()}>
            <div className="sidebar-brand">
              <span className="brand-icon">🍳</span>
              <span className="brand-name">MiCocina</span>
              <button className="btn-icon drawer-close" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <nav className="sidebar-nav">
              {NAV.map(n => (
                <button
                  key={n.id}
                  className={`nav-item${page === n.id ? ' active' : ''}`}
                  onClick={() => navigate(n.id)}
                >
                  <span className="nav-icon">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <div className="main-wrapper">
        {/* Mobile top bar */}
        <header className="mobile-topbar">
          <button className="btn-icon hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="mobile-title">
            {NAV.find(n => n.id === page)?.icon} {NAV.find(n => n.id === page)?.label}
          </span>
          <span style={{ width: 32 }} />
        </header>

        <main className="main-content">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`bottom-nav-item${page === n.id ? ' active' : ''}`}
              onClick={() => navigate(n.id)}
            >
              <span className="bottom-nav-icon">{n.icon}</span>
              <span className="bottom-nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
