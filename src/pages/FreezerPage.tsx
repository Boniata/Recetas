import { useState } from 'react';
import type { Store } from '../store/useStore';
import { daysUntil } from '../store/useStore';
import type { FreezerBatch } from '../types';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

interface Props {
  store: Store;
}

function expiryBadge(best_before: string) {
  const days = daysUntil(best_before);
  if (days < 0) return <Badge label={`Caducado hace ${Math.abs(days)}d`} variant="red" />;
  if (days <= 3) return <Badge label={`Caduca en ${days}d`} variant="red" />;
  if (days <= 14) return <Badge label={`Caduca en ${days}d`} variant="yellow" />;
  return <Badge label={`${days}d restantes`} variant="green" />;
}

function BatchCard({
  batch,
  recipeName,
  onConsume,
  onDelete,
}: {
  batch: FreezerBatch;
  recipeName: string;
  onConsume: (b: FreezerBatch) => void;
  onDelete: (id: string) => void;
}) {
  const lowStock = batch.servings_remaining <= 2;

  return (
    <div className={`batch-card${lowStock ? ' batch-low' : ''}`}>
      <div className="batch-card-header">
        <div className="batch-recipe-name">{recipeName}</div>
        {expiryBadge(batch.best_before)}
      </div>
      <div className="batch-stats">
        <div className="batch-stat">
          <span className="stat-label">Raciones</span>
          <span className="stat-value">
            {batch.servings_remaining} / {batch.servings_total}
          </span>
        </div>
        <div className="batch-stat">
          <span className="stat-label">Congelado</span>
          <span className="stat-value">
            {new Date(batch.frozen_at).toLocaleDateString('es-ES')}
          </span>
        </div>
        <div className="batch-stat">
          <span className="stat-label">Consumir antes de</span>
          <span className="stat-value">
            {new Date(batch.best_before).toLocaleDateString('es-ES')}
          </span>
        </div>
      </div>
      {lowStock && batch.servings_remaining > 0 && (
        <div className="alert alert-warning">
          ⚠️ Solo quedan {batch.servings_remaining} raciones
        </div>
      )}
      <div className="batch-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onConsume(batch)}
          disabled={batch.servings_remaining === 0}
        >
          Consumir raciones
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDelete(batch.id)}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function ConsumeModal({
  batch,
  recipeName,
  store,
  onClose,
}: {
  batch: FreezerBatch;
  recipeName: string;
  store: Store;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(1);
  const [done, setDone] = useState(false);

  function handleConsume() {
    const ok = store.consumeFromBatch(batch.id, amount);
    if (ok) {
      setDone(true);
      setTimeout(onClose, 1200);
    }
  }

  return (
    <Modal title={`Consumir de: ${recipeName}`} onClose={onClose}>
      {done ? (
        <div className="success-msg">✅ ¡Consumido correctamente!</div>
      ) : (
        <>
          <p>Raciones disponibles: <strong>{batch.servings_remaining}</strong></p>
          <div className="scaling-box">
            <div className="scaling-label">
              <span>Raciones a consumir</span>
              <strong className="scaling-value">{amount}</strong>
            </div>
            <input
              type="range"
              min={1}
              max={batch.servings_remaining}
              value={amount}
              onChange={e => setAmount(parseInt(e.target.value))}
              className="slider"
            />
            <div className="scaling-hints">
              <span>1</span>
              <span>{batch.servings_remaining}</span>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConsume}>
              Consumir {amount} {amount === 1 ? 'ración' : 'raciones'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function FreezerPage({ store }: Props) {
  const [consumingBatch, setConsumingBatch] = useState<FreezerBatch | null>(null);
  const [showConsumed, setShowConsumed] = useState(false);

  const activeBatches = store.batches.filter(b => b.status === 'active');
  const consumedBatches = store.batches.filter(b => b.status === 'consumed');

  const expiringSoon = activeBatches.filter(b => daysUntil(b.best_before) <= 3 && daysUntil(b.best_before) >= 0);

  function getRecipeName(recipeId: string) {
    return store.recipes.find(r => r.id === recipeId)?.name ?? 'Receta eliminada';
  }

  function handleDelete(id: string) {
    if (confirm('¿Eliminar este lote del congelador?')) {
      store.deleteBatch(id);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Congelador</h1>
        <div className="freezer-summary">
          <Badge label={`${activeBatches.length} lotes activos`} variant="blue" />
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="alert alert-danger">
          ⏰ {expiringSoon.length} {expiringSoon.length === 1 ? 'lote caduca' : 'lotes caducan'} en los próximos 3 días:
          {' '}{expiringSoon.map(b => getRecipeName(b.recipe_id)).join(', ')}
        </div>
      )}

      {activeBatches.length === 0 ? (
        <div className="empty-state">
          <p>El congelador está vacío.</p>
          <p className="empty-hint">Ve a una receta congelable y pulsa "He cocinado esto hoy".</p>
        </div>
      ) : (
        <div className="batch-grid">
          {activeBatches
            .sort((a, b) => new Date(a.best_before).getTime() - new Date(b.best_before).getTime())
            .map(batch => (
              <BatchCard
                key={batch.id}
                batch={batch}
                recipeName={getRecipeName(batch.recipe_id)}
                onConsume={b => setConsumingBatch(b)}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}

      {consumedBatches.length > 0 && (
        <div className="consumed-section">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowConsumed(v => !v)}
          >
            {showConsumed ? '▲' : '▼'} Historial ({consumedBatches.length} consumidos)
          </button>
          {showConsumed && (
            <div className="batch-grid batch-grid-consumed">
              {consumedBatches.map(batch => (
                <div key={batch.id} className="batch-card batch-consumed">
                  <div className="batch-card-header">
                    <div className="batch-recipe-name">{getRecipeName(batch.recipe_id)}</div>
                    <Badge label="Consumido" variant="gray" />
                  </div>
                  <div className="batch-stats">
                    <div className="batch-stat">
                      <span className="stat-label">Total</span>
                      <span className="stat-value">{batch.servings_total} raciones</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(batch.id)}
                  >
                    Eliminar historial
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {consumingBatch && (
        <ConsumeModal
          batch={consumingBatch}
          recipeName={getRecipeName(consumingBatch.recipe_id)}
          store={store}
          onClose={() => setConsumingBatch(null)}
        />
      )}
    </div>
  );
}
