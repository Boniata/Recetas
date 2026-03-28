import { useState } from 'react';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import RecipesPage from './pages/RecipesPage';
import FreezerPage from './pages/FreezerPage';
import PlannerPage from './pages/PlannerPage';
import type { Page } from './types';

export default function App() {
  const [page, setPage] = useState<Page>('recipes');
  const store = useStore();

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
    <Layout page={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}
