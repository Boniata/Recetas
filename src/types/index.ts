export interface Recipe {
  id: string;
  name: string;
  base_servings: number;
  is_freezable: boolean;
  created_at: string;
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_order: number;
  description: string;
}

export interface FreezerBatch {
  id: string;
  recipe_id: string;
  servings_total: number;
  servings_remaining: number;
  cooked_at: string;
  frozen_at: string;
  best_before: string;
  status: 'active' | 'consumed';
}

export interface MealPlanEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  meal_type: 'comida' | 'cena';
  type: 'cook' | 'freeze';
  recipe_id?: string;
  batch_id?: string;
  servings_used: number;
}

export type Page = 'recipes' | 'freezer' | 'planner';
