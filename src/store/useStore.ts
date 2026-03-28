import { useState, useCallback } from 'react';
import type { Recipe, Ingredient, RecipeStep, FreezerBatch, MealPlanEntry } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
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
  const [recipes, setRecipes] = useState<Recipe[]>(() => load('recipes', []));
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => load('ingredients', []));
  const [steps, setSteps] = useState<RecipeStep[]>(() => load('steps', []));
  const [batches, setBatches] = useState<FreezerBatch[]>(() => load('batches', []));
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>(() => load('mealPlan', []));

  // ── Recipes ──
  const addRecipe = useCallback((data: Omit<Recipe, 'id' | 'created_at'>): Recipe => {
    const recipe: Recipe = { ...data, id: uid(), created_at: new Date().toISOString() };
    setRecipes(prev => {
      const next = [...prev, recipe];
      save('recipes', next);
      return next;
    });
    return recipe;
  }, []);

  const updateRecipe = useCallback((id: string, data: Partial<Omit<Recipe, 'id' | 'created_at'>>) => {
    setRecipes(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...data } : r);
      save('recipes', next);
      return next;
    });
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => { const next = prev.filter(r => r.id !== id); save('recipes', next); return next; });
    setIngredients(prev => { const next = prev.filter(i => i.recipe_id !== id); save('ingredients', next); return next; });
    setSteps(prev => { const next = prev.filter(s => s.recipe_id !== id); save('steps', next); return next; });
  }, []);

  // ── Ingredients ──
  const setRecipeIngredients = useCallback((recipeId: string, items: Omit<Ingredient, 'id' | 'recipe_id'>[]) => {
    setIngredients(prev => {
      const others = prev.filter(i => i.recipe_id !== recipeId);
      const next = [
        ...others,
        ...items.map(i => ({ ...i, id: uid(), recipe_id: recipeId })),
      ];
      save('ingredients', next);
      return next;
    });
  }, []);

  // ── Steps ──
  const setRecipeSteps = useCallback((recipeId: string, items: string[]) => {
    setSteps(prev => {
      const others = prev.filter(s => s.recipe_id !== recipeId);
      const next = [
        ...others,
        ...items.map((desc, idx) => ({ id: uid(), recipe_id: recipeId, step_order: idx + 1, description: desc })),
      ];
      save('steps', next);
      return next;
    });
  }, []);

  // ── Batches ──
  const addBatch = useCallback((data: { recipe_id: string; servings_total: number; frozen_at?: string }): FreezerBatch => {
    const frozenAt = data.frozen_at ?? new Date().toISOString();
    const bestBefore = new Date(new Date(frozenAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const batch: FreezerBatch = {
      id: uid(),
      recipe_id: data.recipe_id,
      servings_total: data.servings_total,
      servings_remaining: data.servings_total,
      cooked_at: new Date().toISOString(),
      frozen_at: frozenAt,
      best_before: bestBefore,
      status: 'active',
    };
    setBatches(prev => {
      const next = [...prev, batch];
      save('batches', next);
      return next;
    });
    return batch;
  }, []);

  const consumeFromBatch = useCallback((batchId: string, amount: number): boolean => {
    let ok = false;
    setBatches(prev => {
      const batch = prev.find(b => b.id === batchId);
      if (!batch || batch.servings_remaining < amount) return prev;
      ok = true;
      const remaining = batch.servings_remaining - amount;
      const next = prev.map(b =>
        b.id === batchId
          ? { ...b, servings_remaining: remaining, status: remaining === 0 ? 'consumed' : 'active' } as FreezerBatch
          : b
      );
      save('batches', next);
      return next;
    });
    return ok;
  }, []);

  const deleteBatch = useCallback((id: string) => {
    setBatches(prev => { const next = prev.filter(b => b.id !== id); save('batches', next); return next; });
  }, []);

  // ── Meal Plan ──
  const addMealEntry = useCallback((entry: Omit<MealPlanEntry, 'id'>): MealPlanEntry => {
    const item: MealPlanEntry = { ...entry, id: uid() };
    setMealPlan(prev => {
      const next = [...prev, item];
      save('mealPlan', next);
      return next;
    });
    return item;
  }, []);

  const removeMealEntry = useCallback((id: string) => {
    setMealPlan(prev => { const next = prev.filter(e => e.id !== id); save('mealPlan', next); return next; });
  }, []);

  return {
    // data
    recipes,
    ingredients,
    steps,
    batches,
    mealPlan,
    // recipe ops
    addRecipe,
    updateRecipe,
    deleteRecipe,
    setRecipeIngredients,
    setRecipeSteps,
    // batch ops
    addBatch,
    consumeFromBatch,
    deleteBatch,
    // meal plan ops
    addMealEntry,
    removeMealEntry,
  };
}

export type Store = ReturnType<typeof useStore>;
