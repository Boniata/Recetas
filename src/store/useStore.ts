import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Recipe, Ingredient, RecipeStep, FreezerBatch, MealPlanEntry } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function scaleQty(qty: number, base: number, target: number): number {
  if (base === 0) return qty;
  return Math.round((qty * (target / base)) * 10) / 10;
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── store ────────────────────────────────────────────────────────────────────

export function useStore() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [batches, setBatches] = useState<FreezerBatch[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ready = 0;
    const done = () => { if (++ready >= 5) setLoading(false); };
    const fail = (e: unknown) => { console.error('Firestore error:', e); done(); };

    // Timeout fallback — never hang forever
    const timeout = setTimeout(() => { if (ready < 5) setLoading(false); }, 8000);

    const unsubs = [
      onSnapshot(collection(db, 'recipes'),
        snap => { setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Recipe)); done(); }, fail),
      onSnapshot(collection(db, 'ingredients'),
        snap => { setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Ingredient)); done(); }, fail),
      onSnapshot(collection(db, 'steps'),
        snap => { setSteps(snap.docs.map(d => ({ id: d.id, ...d.data() }) as RecipeStep)); done(); }, fail),
      onSnapshot(collection(db, 'batches'),
        snap => { setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() }) as FreezerBatch)); done(); }, fail),
      onSnapshot(collection(db, 'mealPlan'),
        snap => { setMealPlan(snap.docs.map(d => ({ id: d.id, ...d.data() }) as MealPlanEntry)); done(); }, fail),
    ];

    return () => { clearTimeout(timeout); unsubs.forEach(u => u()); };
  }, []);

  // ── Recipes ──
  const addRecipe = useCallback((data: Omit<Recipe, 'id' | 'created_at'>): Recipe => {
    const id = uid();
    const recipe: Recipe = { ...data, id, created_at: new Date().toISOString() };
    setRecipes(prev => [...prev, recipe]); // optimistic
    setDoc(doc(db, 'recipes', id), recipe).catch(console.error);
    return recipe;
  }, []);

  const updateRecipe = useCallback((id: string, data: Partial<Omit<Recipe, 'id' | 'created_at'>>) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r)); // optimistic
    updateDoc(doc(db, 'recipes', id), data as Record<string, unknown>).catch(console.error);
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id)); // optimistic
    setIngredients(prev => prev.filter(i => i.recipe_id !== id));
    setSteps(prev => prev.filter(s => s.recipe_id !== id));
    const batch = writeBatch(db);
    batch.delete(doc(db, 'recipes', id));
    ingredients.filter(i => i.recipe_id === id).forEach(i => batch.delete(doc(db, 'ingredients', i.id)));
    steps.filter(s => s.recipe_id === id).forEach(s => batch.delete(doc(db, 'steps', s.id)));
    batch.commit().catch(console.error);
  }, [ingredients, steps]);

  // ── Ingredients ──
  const setRecipeIngredients = useCallback((recipeId: string, items: Omit<Ingredient, 'id' | 'recipe_id'>[]) => {
    const newItems: Ingredient[] = items.map(item => ({ ...item, id: uid(), recipe_id: recipeId }));
    setIngredients(prev => [...prev.filter(i => i.recipe_id !== recipeId), ...newItems]); // optimistic
    const batch = writeBatch(db);
    ingredients.filter(i => i.recipe_id === recipeId).forEach(i => batch.delete(doc(db, 'ingredients', i.id)));
    newItems.forEach(item => batch.set(doc(db, 'ingredients', item.id), item));
    batch.commit().catch(console.error);
  }, [ingredients]);

  // ── Steps ──
  const setRecipeSteps = useCallback((recipeId: string, descriptions: string[]) => {
    const newSteps: RecipeStep[] = descriptions.map((description, idx) => ({
      id: uid(), recipe_id: recipeId, step_order: idx + 1, description,
    }));
    setSteps(prev => [...prev.filter(s => s.recipe_id !== recipeId), ...newSteps]); // optimistic
    const batch = writeBatch(db);
    steps.filter(s => s.recipe_id === recipeId).forEach(s => batch.delete(doc(db, 'steps', s.id)));
    newSteps.forEach(s => batch.set(doc(db, 'steps', s.id), s));
    batch.commit().catch(console.error);
  }, [steps]);

  // ── Batches ──
  const addBatch = useCallback((data: { recipe_id: string; servings_total: number; frozen_at?: string }): FreezerBatch => {
    const id = uid();
    const frozenAt = data.frozen_at ?? new Date().toISOString();
    const bestBefore = new Date(new Date(frozenAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const batch: FreezerBatch = {
      id,
      recipe_id: data.recipe_id,
      servings_total: data.servings_total,
      servings_remaining: data.servings_total,
      cooked_at: new Date().toISOString(),
      frozen_at: frozenAt,
      best_before: bestBefore,
      status: 'active',
    };
    setBatches(prev => [...prev, batch]); // optimistic
    setDoc(doc(db, 'batches', id), batch).catch(console.error);
    return batch;
  }, []);

  const consumeFromBatch = useCallback((batchId: string, amount: number): boolean => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch || batch.servings_remaining < amount) return false;
    const remaining = batch.servings_remaining - amount;
    const status = remaining === 0 ? 'consumed' : 'active';
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, servings_remaining: remaining, status } : b)); // optimistic
    updateDoc(doc(db, 'batches', batchId), { servings_remaining: remaining, status }).catch(console.error);
    return true;
  }, [batches]);

  const deleteBatch = useCallback((id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id)); // optimistic
    deleteDoc(doc(db, 'batches', id)).catch(console.error);
  }, []);

  // ── Meal Plan ──
  const addMealEntry = useCallback((entry: Omit<MealPlanEntry, 'id'>): MealPlanEntry => {
    const id = uid();
    const item: MealPlanEntry = { ...entry, id };
    setMealPlan(prev => [...prev, item]); // optimistic
    setDoc(doc(db, 'mealPlan', id), item).catch(console.error);
    return item;
  }, []);

  const removeMealEntry = useCallback((id: string) => {
    setMealPlan(prev => prev.filter(e => e.id !== id)); // optimistic
    deleteDoc(doc(db, 'mealPlan', id)).catch(console.error);
  }, []);

  return {
    loading,
    recipes,
    ingredients,
    steps,
    batches,
    mealPlan,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    setRecipeIngredients,
    setRecipeSteps,
    addBatch,
    consumeFromBatch,
    deleteBatch,
    addMealEntry,
    removeMealEntry,
  };
}

export type Store = ReturnType<typeof useStore>;
