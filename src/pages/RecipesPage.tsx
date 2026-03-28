import { useState, useEffect } from 'react';
import type { Store } from '../store/useStore';
import { scaleQty } from '../store/useStore';
import type { Recipe, Ingredient } from '../types';
import Modal from '../components/ui/Modal';
import { parseRecipeText } from '../store/parseRecipeText';

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

  function getScaled(ing: Ingredient): number {
    return scaleQty(ing.quantity, recipe.base_servings, servings);
  }

  function handleIngQtyChange(ing: Ingredient, raw: string) {
    if (ing.unit === 'al gusto' || ing.quantity === 0) return;
    const val = parseFloat(raw.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      const ratio = val / ing.quantity;
      const newServings = Math.max(1, Math.round(recipe.base_servings * ratio));
      setServings(newServings);
    }
  }

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
                {ing.unit === 'al gusto' || ing.quantity === 0 ? (
                  <span className="ing-qty ing-qty-static">al gusto</span>
                ) : (
                  <input
                    className="ing-qty ing-qty-input"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={getScaled(ing)}
                    onChange={e => handleIngQtyChange(ing, e.target.value)}
                  />
                )}
                <span className="ing-unit">{ing.unit !== 'al gusto' ? ing.unit : ''}</span>
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

// ── Import Modal ───────────────────────────────────────────────────────────────

function ImportModal({
  store,
  onClose,
  onImported,
}: {
  store: Store;
  onClose: () => void;
  onImported: (r: Recipe) => void;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseRecipeText> | null>(null);
  const [saved, setSaved] = useState(false);

  function handleParse() {
    if (!text.trim()) return;
    setPreview(parseRecipeText(text));
  }

  function handleSave() {
    if (!preview) return;
    const recipe = store.addRecipe({
      name: preview.name,
      base_servings: preview.base_servings,
      is_freezable: preview.is_freezable,
    });
    store.setRecipeIngredients(recipe.id, preview.ingredients);
    store.setRecipeSteps(recipe.id, preview.steps.map(s => s));
    setSaved(true);
    setTimeout(() => onImported(recipe), 900);
  }

  return (
    <Modal title="Importar receta desde texto" onClose={onClose} width="600px">
      {saved ? (
        <div className="success-msg">✅ ¡Receta importada!</div>
      ) : !preview ? (
        <>
          <p className="import-hint">
            Pega el texto de la receta — de un blog, una web, un chat, lo que sea.
            El sistema detectará automáticamente el nombre, ingredientes y pasos.
          </p>
          <textarea
            className="input import-textarea"
            placeholder={`Lentejas con chorizo\n\nIngredientes (4 personas):\n- 300g de lentejas\n- 2 chorizos\n- 1 cebolla\n- 2 dientes de ajo\n- sal al gusto\n\nPreparación:\n1. Poner las lentejas en remojo...\n2. Sofreír la cebolla...`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
          />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleParse} disabled={!text.trim()}>
              Analizar texto →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="import-preview">
            <div className="preview-field">
              <span className="preview-label">Nombre</span>
              <span className="preview-value">{preview.name}</span>
            </div>
            <div className="preview-field">
              <span className="preview-label">Raciones</span>
              <span className="preview-value">{preview.base_servings}</span>
            </div>
            <div className="preview-field">
              <span className="preview-label">Congelable</span>
              <span className="preview-value">{preview.is_freezable ? '❄️ Sí' : 'No'}</span>
            </div>

            {preview.ingredients.length > 0 && (
              <div className="preview-section">
                <span className="preview-label">Ingredientes detectados ({preview.ingredients.length})</span>
                <ul className="preview-list">
                  {preview.ingredients.map((ing, i) => (
                    <li key={i}>
                      <span className="ing-qty">
                        {ing.unit === 'al gusto' ? 'al gusto' : `${ing.quantity} ${ing.unit}`}
                      </span>
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.steps.length > 0 && (
              <div className="preview-section">
                <span className="preview-label">Pasos detectados ({preview.steps.length})</span>
                <ol className="preview-steps">
                  {preview.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            {preview.ingredients.length === 0 && preview.steps.length === 0 && (
              <div className="alert alert-warning">
                No se detectaron ingredientes ni pasos. Prueba a editar la receta manualmente después de importar.
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>← Volver a editar</button>
            <button className="btn btn-primary" onClick={handleSave}>Guardar receta</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Recipes Page ───────────────────────────────────────────────────────────────

export default function RecipesPage({ store }: Props) {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Push history when navigating into detail/form so browser back works
  function goTo(v: View, recipe?: Recipe) {
    if (v === 'detail' && recipe) {
      window.history.pushState({ view: 'detail', recipeId: recipe.id }, '');
      setSelected(recipe);
    } else if (v === 'form') {
      window.history.pushState({ view: 'form' }, '');
    } else {
      setSelected(null);
      setEditing(null);
    }
    setView(v);
  }

  function goBack() {
    setSelected(null);
    setEditing(null);
    setView('list');
  }

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const state = e.state as { view?: string; page?: string } | null;
      if (!state || state.page) return; // page-level navigation handled in App
      goBack();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (view === 'form') {
    return (
      <RecipeForm
        store={store}
        initial={editing ?? undefined}
        onDone={() => {
          if (editing) { window.history.back(); }
          else { window.history.back(); }
        }}
      />
    );
  }

  if (view === 'detail' && selected) {
    return (
      <RecipeDetail
        recipe={selected}
        store={store}
        onEdit={() => { setEditing(selected); goTo('form'); }}
        onBack={() => window.history.back()}
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
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            📋 Importar texto
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); goTo('form'); }}>
            + Nueva receta
          </button>
        </div>
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
                onClick={() => goTo('detail', recipe)}
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

      {showImport && (
        <ImportModal
          store={store}
          onClose={() => setShowImport(false)}
          onImported={recipe => goTo('detail', recipe)}
        />
      )}
    </div>
  );
}
