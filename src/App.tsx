import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { migrateFromLocalStorage } from './store/migrate';
import Layout from './components/Layout';
import RecipesPage from './pages/RecipesPage';
import FreezerPage from './pages/FreezerPage';
import PlannerPage from './pages/PlannerPage';
import type { Page } from './types';

export default function App() {
  const [page, setPage] = useState<Page>('recipes');
  const store = useStore();

  useEffect(() => {
    migrateFromLocalStorage().catch(console.error);
  }, []);

  // Seed initial history entry
  useEffect(() => {
    window.history.replaceState({ page: 'recipes' }, '');
  }, []);

  // Handle browser/mobile back button at the page level
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (e.state?.page) setPage(e.state.page as Page);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  function navigate(p: Page) {
    if (p !== page) {
      window.history.pushState({ page: p }, '');
      setPage(p);
    }
  }

  if (store.loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  function renderPage() {
    switch (page) {
      case 'recipes': return <RecipesPage store={store} />;
      case 'freezer': return <FreezerPage store={store} />;
      case 'planner': return <PlannerPage store={store} />;
    }
  }

  return (
    <Layout page={page} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}
