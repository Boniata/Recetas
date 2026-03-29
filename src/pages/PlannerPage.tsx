import { useState } from 'react';
import type { Store } from '../store/useStore';
import { daysUntil } from '../store/useStore';
import type { MealPlanEntry } from '../types';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

interface Props {
  store: Store;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEALS: { id: 'comida' | 'cena'; label: string }[] = [
  { id: 'comida', label: '☀️ Comida' },
  { id: 'cena', label: '🌙 Cena' },
];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── Add Meal Modal ─────────────────────────────────────────────────────────────

function AddMealModal({
  store,
  date,
  mealType,
  onClose,
}: {
  store: Store;
  date: string;
  mealType: 'comida' | 'cena';
  onClose: () => void;
}) {
  // 'cook' = cocinar normal, 'batch' = cocinar y congelar, 'freeze' = usar del congelador
  const [type, setType] = useState<'cook' | 'batch' | 'freeze'>('cook');
  const [recipeId, setRecipeId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [servings, setServings] = useState(2);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const activeBatches = store.batches.filter(b => b.status === 'active');
  const selectedBatch = activeBatches.find(b => b.id === batchId);
  const freezableRecipes = store.recipes.filter(r => r.is_freezable);
  const normalRecipes = store.recipes.filter(r => !r.is_freezable);

  function pickRecipe(id: string) {
    setRecipeId(id);
    setServings(store.recipes.find(r => r.id === id)?.base_servings ?? 2);
  }

  function handleAdd() {
    setError('');

    if (type === 'cook' || type === 'batch') {
      if (!recipeId) { setError('Selecciona una receta.'); return; }
      store.addMealEntry({ date, meal_type: mealType, type: 'cook', recipe_id: recipeId, servings_used: servings });
      if (type === 'batch') {
        store.addBatch({ recipe_id: recipeId, servings_total: servings });
      }
    } else {
      if (!batchId) { setError('Selecciona un lote del congelador.'); return; }
      if (!selectedBatch) { setError('Lote no encontrado.'); return; }
      if (servings > selectedBatch.servings_remaining) {
        setError(`Solo hay ${selectedBatch.servings_remaining} raciones disponibles.`); return;
      }
      store.consumeFromBatch(batchId, servings);
      store.addMealEntry({ date, meal_type: mealType, type: 'freeze', batch_id: batchId, recipe_id: selectedBatch.recipe_id, servings_used: servings });
    }

    setDone(true);
    setTimeout(onClose, 1000);
  }

  const mealLabel = mealType === 'comida' ? 'Comida' : 'Cena';
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Modal title={`${mealLabel} — ${dateLabel}`} onClose={onClose} width="520px">
      {done ? (
        <div className="success-msg">✅ ¡Añadido al planificador!</div>
      ) : (
        <>
          <div className="type-tabs">
            <button className={`type-tab${type === 'cook' ? ' active' : ''}`} onClick={() => { setType('cook'); setRecipeId(''); setError(''); }}>
              🍳 Cocinar
            </button>
            <button className={`type-tab${type === 'batch' ? ' active' : ''}`} onClick={() => { setType('batch'); setRecipeId(''); setError(''); }}>
              🥘 Cocinar y congelar
            </button>
            <button className={`type-tab${type === 'freeze' ? ' active' : ''}`} onClick={() => { setType('freeze'); setError(''); }}>
              ❄️ Del congelador
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {(type === 'cook' || type === 'batch') ? (
            <div className="modal-form">
              <div className="form-group">
                <label>{type === 'batch' ? 'Receta para congelar' : 'Receta'}</label>
                <select className="select" value={recipeId} onChange={e => pickRecipe(e.target.value)}>
                  <option value="">Seleccionar receta...</option>
                  {type === 'batch' ? (
                    // Batch cooking: only show freezable recipes
                    freezableRecipes.length > 0
                      ? freezableRecipes.map(r => <option key={r.id} value={r.id}>❄️ {r.name}</option>)
                      : <option disabled>No hay recetas congelables</option>
                  ) : (
                    // Normal cook: show all, grouped
                    <>
                      {normalRecipes.length > 0 && (
                        <optgroup label="Recetas normales">
                          {normalRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </optgroup>
                      )}
                      {freezableRecipes.length > 0 && (
                        <optgroup label="Congelables ❄️">
                          {freezableRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>
              <div className="scaling-box">
                <div className="scaling-label">
                  <span>Raciones</span>
                  <strong className="scaling-value">{servings}</strong>
                </div>
                <input type="range" min={1} max={20} value={servings} onChange={e => setServings(parseInt(e.target.value))} className="slider" />
                <div className="scaling-hints"><span>1</span><span>20</span></div>
              </div>
              {type === 'batch' && (
                <p className="batch-note">Se añadirá al planificador y se creará un lote de {servings} raciones en el congelador.</p>
              )}
            </div>
          ) : (
            <div className="modal-form">
              {activeBatches.length === 0 ? (
                <div className="empty-state-sm">No hay lotes en el congelador.</div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Lote del congelador</label>
                    <select
                      className="select"
                      value={batchId}
                      onChange={e => {
                        setBatchId(e.target.value);
                        const b = activeBatches.find(b => b.id === e.target.value);
                        if (b) setServings(Math.min(1, b.servings_remaining));
                      }}
                    >
                      <option value="">Seleccionar lote...</option>
                      {activeBatches.map(b => {
                        const name = store.recipes.find(r => r.id === b.recipe_id)?.name ?? '—';
                        const days = daysUntil(b.best_before);
                        const expiry = days < 0 ? 'Caducado' : `${days}d restantes`;
                        return (
                          <option key={b.id} value={b.id}>
                            {name} — {b.servings_remaining} rac. ({expiry})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {selectedBatch && (
                    <>
                      <div className="batch-info-row">
                        <Badge
                          label={`${selectedBatch.servings_remaining} raciones disponibles`}
                          variant={selectedBatch.servings_remaining <= 2 ? 'yellow' : 'green'}
                        />
                      </div>
                      <div className="scaling-box">
                        <div className="scaling-label">
                          <span>Raciones a usar</span>
                          <strong className="scaling-value">{servings}</strong>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={selectedBatch.servings_remaining}
                          value={servings}
                          onChange={e => setServings(parseInt(e.target.value))}
                          className="slider"
                        />
                        <div className="scaling-hints">
                          <span>1</span>
                          <span>{selectedBatch.servings_remaining}</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd}>Añadir</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Entry display in slot ──────────────────────────────────────────────────────

function EntryChip({
  entry,
  store,
  onRemove,
}: {
  entry: MealPlanEntry;
  store: Store;
  onRemove: () => void;
}) {
  const recipe = store.recipes.find(r => r.id === entry.recipe_id);
  const name = recipe?.name ?? 'Receta eliminada';

  return (
    <div className={`entry-chip${entry.type === 'freeze' ? ' chip-freeze' : ' chip-cook'}`}>
      <span className="chip-icon">{entry.type === 'freeze' ? '❄️' : '🍳'}</span>
      <span className="chip-name">{name}</span>
      <span className="chip-servings">{entry.servings_used}r</span>
      <button className="chip-remove" onClick={onRemove}>✕</button>
    </div>
  );
}

// ── Planner Page ───────────────────────────────────────────────────────────────

export default function PlannerPage({ store }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [adding, setAdding] = useState<{ date: string; mealType: 'comida' | 'cena' } | null>(null);

  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }
  function goToday() { setWeekStart(getMonday(new Date())); }

  function getEntries(date: Date, mealType: 'comida' | 'cena'): MealPlanEntry[] {
    const dateStr = toDateStr(date);
    return store.mealPlan.filter(e => e.date === dateStr && e.meal_type === mealType);
  }

  const weekLabel = `${formatShortDate(weekStart)} — ${formatShortDate(addDays(weekStart, 6))}`;
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getMonday(new Date()));

  return (
    <div className="page planner-page">
      <div className="page-header">
        <h1 className="page-title">Planificador</h1>
        <span style={{fontSize:'10px',color:'#aaa',marginLeft:8}}>v{__BUILD_TIME__.slice(0,16).replace('T',' ')}</span>
        <div className="planner-nav">
          <button className="btn btn-ghost btn-sm" onClick={prevWeek}>← Anterior</button>
          <span className="week-label">{weekLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextWeek}>Siguiente →</button>
          {!isCurrentWeek && (
            <button className="btn btn-secondary btn-sm" onClick={goToday}>Hoy</button>
          )}
        </div>
      </div>

      <div className="week-grid">
        {/* Header row */}
        <div className="week-header-row">
          <div className="meal-label-col" />
          {weekDays.map((day, i) => {
            const isToday = toDateStr(day) === toDateStr(new Date());
            return (
              <div key={i} className={`day-header${isToday ? ' today' : ''}`}>
                <div className="day-name">{DAYS[i]}</div>
                <div className="day-date">{formatShortDate(day)}</div>
              </div>
            );
          })}
        </div>

        {/* Meal rows */}
        {MEALS.map(meal => (
          <div key={meal.id} className="meal-row">
            <div className="meal-label-col">
              <span>{meal.label}</span>
            </div>
            {weekDays.map((day, i) => {
              const entries = getEntries(day, meal.id);
              const dateStr = toDateStr(day);
              return (
                <div key={i} className="day-slot">
                  {entries.map(entry => (
                    <EntryChip
                      key={entry.id}
                      entry={entry}
                      store={store}
                      onRemove={() => store.removeMealEntry(entry.id)}
                    />
                  ))}
                  <button
                    className="slot-add-btn"
                    onClick={() => setAdding({ date: dateStr, mealType: meal.id })}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {adding && (
        <AddMealModal
          store={store}
          date={adding.date}
          mealType={adding.mealType}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}
