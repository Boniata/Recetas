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
  const [migrating, setMigrating] = useState(true);

  useEffect(() => {
    migrateFromLocalStorage()
      .catch(console.error)
      .finally(() => setMigrating(false));
  }, []);

  if (store.loading || migrating) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>{migrating && !store.loading ? 'Migrando datos...' : 'Cargando...'}</p>
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
    <Layout page={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}
