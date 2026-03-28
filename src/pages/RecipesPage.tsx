import { useState } from 'react';
import type { Store } from '../store/useStore';
import { scaleQty } from '../store/useStore';
import type { Recipe, Ingredient } from '../types';
import Modal from '../components/ui/Modal';

type View = 'list' | 'form' | 'detail';

interface IngredientRow {
  name: string;
  quantity: string;
  unit: string;
}

interface Props {
  store: Store;
}

const UNITS = ['g', 'kg', 'ml', 'l', 'unidad', 'cucharada', 'cucharadita', 'taza', 'al gusto'];

function emptyRow(): IngredientRow {
  return { name: '', quantity: '', unit: 'g' };
}

// ── Recipe Form ────────────────────────────────────────────────────────────────

function RecipeForm({
  store,
  initial,
  onDone,
}: {
  store: Store;
  initial?: Recipe;
  onDone: () => void;
}) {
  const existingIngredients = initial
    ? store.ingredients.filter(i => i.recipe_id === initial.id)
    : [];
  const existingSteps = initial
    ? store.steps.filter(s => s.recipe_id === initial.id).sort((a, b) => a.step_order - b.step_order)
    : [];

  const [name, setName] = useState(initial?.name ?? '');
  const [baseServings, setBaseServings] = useState(initial?.base_servings ?? 4);
  const [isFreezable, setIsFreezable] = useState(initial?.is_freezable ?? true);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(
    existingIngredients.length
      ? existingIngredients.map(i => ({ name: i.name, quantity: String(i.quantity), unit: i.unit }))
      : [emptyRow()]
  );
  const [stepTexts, setStepTexts] = useState<string[]>(
    existingSteps.length ? existingSteps.map(s => s.description) : ['']
  );
  const [error, setError] = useState('');

  function addIngredientRow() {
    setIngredientRows(r => [...r, emptyRow()]);
  }

  function updateIngredientRow(idx: number, field: keyof IngredientRow, value: string) {
    setIngredientRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function removeIngredientRow(idx: number) {
    setIngredientRows(r => r.filter((_, i) => i !== idx));
  }

  function addStep() {
    setStepTexts(s => [...s, '']);
  }

  function updateStep(idx: number, value: string) {
    setStepTexts(s => s.map((t, i) => i === idx ? value : t));
  }

  function removeStep(idx: number) {
    setStepTexts(s => s.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (baseServings < 1) { setError('Las raciones base deben ser ≥ 1.'); return; }

    const parsedIngredients = ingredientRows
      .filter(r => r.name.trim())
      .map(r => ({
        name: r.name.trim(),
        quantity: r.unit === 'al gusto' ? 0 : (parseFloat(r.quantity) || 0),
        unit: r.unit,
      }));

    const parsedSteps = stepTexts.filter(t => t.trim());

    if (initial) {
      store.updateRecipe(initial.id, { name: name.trim(), base_servings: baseServings, is_freezable: isFreezable });
      store.setRecipeIngredients(initial.id, parsedIngredients);
      store.setRecipeSteps(initial.id, parsedSteps);
    } else {
      const recipe = store.addRecipe({ name: name.trim(), base_servings: baseServings, is_freezable: isFreezable });
      store.setRecipeIngredients(recipe.id, parsedIngredients);
      store.setRecipeSteps(recipe.id, parsedSteps);
    }
    onDone();
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h1 className="page-title">{initial ? 'Editar receta' : 'Nueva receta'}</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="form-group">
        <label>Nombre</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Lentejas con chorizo"
          autoFocus
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Raciones base</label>
          <input
            className="input"
            type="number"
            min={1}
            max={100}
            value={baseServings}
            onChange={e => setBaseServings(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
        <div className="form-group form-group-toggle">
          <label>Apta para congelar</label>
          <button
            type="button"
            className={`toggle ${isFreezable ? 'on' : 'off'}`}
            onClick={() => setIsFreezable(v => !v)}
          >
            {isFreezable ? '❄️ Sí' : '✗ No'}
          </button>
        </div>
      </div>

      {/* Ingredients */}
      <div className="form-section">
        <div className="section-header">
          <h3>Ingredientes</h3>
          <button type="button" className="btn btn-sm btn-secondary" onClick={addIngredientRow}>+ Añadir</button>
        </div>
        <div className="ingredient-list">
          {ingredientRows.map((row, idx) => (
            <div key={idx} className="ingredient-row">
              <input
                className="input ingredient-name"
                placeholder="Ingrediente"
                value={row.name}
                onChange={e => updateIngredientRow(idx, 'name', e.target.value)}
              />
              <input
                className="input ingredient-qty"
                placeholder="Cantidad"
                type={row.unit === 'al gusto' ? 'text' : 'number'}
                min={0}
                step={0.1}
                value={row.unit === 'al gusto' ? 'al gusto' : row.quantity}
                readOnly={row.unit === 'al gusto'}
                onChange={e => updateIngredientRow(idx, 'quantity', e.target.value)}
              />
              <select
                className="select ingredient-unit"
                value={row.unit}
                onChange={e => updateIngredientRow(idx, 'unit', e.target.value)}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                type="button"
                className="btn-icon btn-icon-danger"
                onClick={() => removeIngredientRow(idx)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="form-section">
        <div className="section-header">
          <h3>Pasos</h3>
          <button type="button" className="btn btn-sm btn-secondary" onClick={addStep}>+ Añadir</button>
        </div>
        <div className="steps-list">
          {stepTexts.map((text, idx) => (
            <div key={idx} className="step-row">
              <span className="step-number">{idx + 1}</span>
              <textarea
                className="input step-text"
                placeholder="Describe el paso..."
                value={text}
                rows={2}
                onChange={e => updateStep(idx, e.target.value)}
              />
              <button
                type="button"
                className="btn-icon btn-icon-danger"
                onClick={() => removeStep(idx)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Guardar receta</button>
      </div>
    </form>
  );
}

// ── Recipe Detail ──────────────────────────────────────────────────────────────

function RecipeDetail({
  recipe,
  store,
  onEdit,
  onBack,
}: {
  recipe: Recipe;
  store: Store;
  onEdit: () => void;
  onBack: () => void;
}) {
  const [servings, setServings] = useState(recipe.base_servings);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchServings, setBatchServings] = useState(recipe.base_servings);
  const [batchCreated, setBatchCreated] = useState(false);

  const ings = store.ingredients.filter(i => i.recipe_id === recipe.id);
  const stps = store.steps
    .filter(s => s.recipe_id === recipe.id)
    .sort((a, b) => a.step_order - b.step_order);

  function handleCreateBatch() {
    store.addBatch({ recipe_id: recipe.id, servings_total: batchServings });
    setBatchCreated(true);
    setTimeout(() => { setBatchCreated(false); setShowBatchModal(false); }, 1200);
  }

  function handleDelete() {
    if (confirm(`¿Eliminar "${recipe.name}"? Esta acción no se puede deshacer.`)) {
      store.deleteRecipe(recipe.id);
      onBack();
    }
  }

  const displayIngredient = (ing: Ingredient) => {
    if (ing.unit === 'al gusto') return 'al gusto';
    const scaled = scaleQty(ing.quantity, recipe.base_servings, servings);
    return `${scaled} ${ing.unit}`;
  };

  return (
    <div className="recipe-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <div className="detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Eliminar</button>
        </div>
      </div>

      <div className="detail-hero">
        <h1>{recipe.name}</h1>
        <div className="detail-meta">
          <span className="meta-badge">Base: {recipe.base_servings} raciones</span>
          {recipe.is_freezable && <span className="meta-badge meta-freezable">❄️ Congelable</span>}
        </div>
      </div>

      {/* Scaling slider */}
      <div className="scaling-box">
        <div className="scaling-label">
          <span>Raciones</span>
          <strong className="scaling-value">{servings}</strong>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={servings}
          onChange={e => setServings(parseInt(e.target.value))}
          className="slider"
        />
        <div className="scaling-hints">
          <span>1</span><span>20</span>
        </div>
      </div>

      {ings.length > 0 && (
        <div className="detail-section">
          <h3>Ingredientes{servings !== recipe.base_servings ? ` (×${(servings / recipe.base_servings).toFixed(2)})` : ''}</h3>
          <ul className="ingredient-display-list">
            {ings.map(ing => (
              <li key={ing.id}>
                <span className="ing-qty">{displayIngredient(ing)}</span>
                <span className="ing-name">{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stps.length > 0 && (
        <div className="detail-section">
          <h3>Pasos</h3>
          <ol className="steps-display-list">
            {stps.map(s => <li key={s.id}>{s.description}</li>)}
          </ol>
        </div>
      )}

      {recipe.is_freezable && (
        <div className="quick-cook-bar">
          <button className="btn btn-primary btn-cook" onClick={() => { setBatchServings(servings); setShowBatchModal(true); }}>
            🍳 He cocinado esto hoy
          </button>
        </div>
      )}

      {showBatchModal && (
        <Modal title="Crear lote en el congelador" onClose={() => setShowBatchModal(false)}>
          {batchCreated ? (
            <div className="success-msg">✅ ¡Lote creado correctamente!</div>
          ) : (
            <>
              <p>¿Cuántas raciones has cocinado?</p>
              <div className="scaling-box">
                <div className="scaling-label">
                  <span>Raciones cocinadas</span>
                  <strong className="scaling-value">{batchServings}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={batchServings}
                  onChange={e => setBatchServings(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="scaling-hints"><span>1</span><span>20</span></div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleCreateBatch}>Crear lote ❄️</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Recipes Page ───────────────────────────────────────────────────────────────

export default function RecipesPage({ store }: Props) {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');

  if (view === 'form') {
    return (
      <RecipeForm
        store={store}
        initial={editing ?? undefined}
        onDone={() => {
          if (editing) { setView('detail'); }
          else { setView('list'); setEditing(null); }
        }}
      />
    );
  }

  if (view === 'detail' && selected) {
    return (
      <RecipeDetail
        recipe={selected}
        store={store}
        onEdit={() => { setEditing(selected); setView('form'); }}
        onBack={() => { setSelected(null); setView('list'); }}
      />
    );
  }

  // List view
  const filtered = store.recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Recetas</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setView('form'); }}>
          + Nueva receta
        </button>
      </div>

      <input
        className="input search-input"
        placeholder="Buscar receta..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No hay recetas todavía.</p>
          <button className="btn btn-primary" onClick={() => setView('form')}>Crear primera receta</button>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map(recipe => {
            const ingCount = store.ingredients.filter(i => i.recipe_id === recipe.id).length;
            return (
              <div
                key={recipe.id}
                className="recipe-card"
                onClick={() => { setSelected(recipe); setView('detail'); }}
              >
                <div className="recipe-card-body">
                  <h3 className="recipe-card-name">{recipe.name}</h3>
                  <div className="recipe-card-meta">
                    <span>{recipe.base_servings} raciones</span>
                    {ingCount > 0 && <span>{ingCount} ingredientes</span>}
                    {recipe.is_freezable && <span className="freezable-tag">❄️</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
