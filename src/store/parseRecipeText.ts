import type { Ingredient } from '../types';

// ── Unit detection ────────────────────────────────────────────────────────────

const UNIT_MAP: Record<string, string> = {
  // gramos
  g: 'g', gr: 'g', gramo: 'g', gramos: 'g',
  // kilos
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  // mililitros
  ml: 'ml', 'ml.': 'ml', mililitro: 'ml', mililitros: 'ml',
  // litros
  l: 'l', lt: 'l', litro: 'l', litros: 'l',
  // cucharadas
  cucharada: 'cucharada', cucharadas: 'cucharada',
  cda: 'cucharada', cdas: 'cucharada',
  tbsp: 'cucharada',
  // cucharaditas
  cucharadita: 'cucharadita', cucharaditas: 'cucharadita',
  cdita: 'cucharadita', cditas: 'cucharadita',
  tsp: 'cucharadita',
  // tazas
  taza: 'taza', tazas: 'taza', cup: 'taza', cups: 'taza',
  // unidad
  unidad: 'unidad', unidades: 'unidad',
  pieza: 'unidad', piezas: 'unidad',
  trozo: 'unidad', trozos: 'unidad',
  // pizca
  pizca: 'cucharadita', pizcas: 'cucharadita',
};

const UNIT_PATTERN = Object.keys(UNIT_MAP).join('|');

// Matches: "200 g de harina", "2 huevos", "1/2 cebolla", "sal al gusto"
const INGREDIENT_RE = new RegExp(
  [
    '^',
    // optional bullet/dash/asterisk
    '[\\-•*–]?\\s*',
    // optional quantity: integer, decimal, or fraction (1/2)
    '(?<qty>[\\d]+(?:[.,][\\d]+)?(?:\\s*/\\s*[\\d]+)?)?\\s*',
    // optional unit
    `(?<unit>${UNIT_PATTERN})\\.?\\s*(?:de\\s+)?`,
    // ingredient name (rest of line)
    '(?<name>.+)',
    '$',
  ].join(''),
  'i'
);

// Simpler fallback: "2 huevos", "3 dientes de ajo"
const SIMPLE_INGREDIENT_RE = /^[-•*–]?\s*(?<qty>[\d]+(?:[.,][\d]+)?(?:\s*\/\s*[\d]+)?)?\s*(?<name>[a-záéíóúüñ].{2,})$/i;

const AL_GUSTO_RE = /al\s+gusto/i;

// ── Servings detection ────────────────────────────────────────────────────────

const SERVINGS_RE = /(?:para|raciones?|personas?|porciones?|comensales?)[:\s]+(\d+)/i;
const SERVINGS_RE2 = /(\d+)\s*(?:raciones?|personas?|porciones?|comensales?)/i;

// ── Section headers ────────────────────────────────────────────────────────────

const INGREDIENT_SECTION_RE = /^(ingredientes?|ingredientes?\s*:)\s*$/i;
const STEP_SECTION_RE = /^(preparaci[oó]n|elaboraci[oó]n|instrucciones?|pasos?|m[eé]todo|c[oó]mo\s+hacerlo)\s*:?\s*$/i;
const FREEZABLE_RE = /congela|congelar|apto.*congel/i;

// ── Fraction parsing ──────────────────────────────────────────────────────────

function parseFraction(str: string): number {
  const parts = str.split('/');
  if (parts.length === 2) return parseFloat(parts[0]) / parseFloat(parts[1]);
  return parseFloat(str.replace(',', '.'));
}

// ── Step detection ────────────────────────────────────────────────────────────

const STEP_RE = /^(?:\d+[.)]\s*|paso\s+\d+[.):\s]+)/i;

// ── Main parser ───────────────────────────────────────────────────────────────

export interface ParsedRecipe {
  name: string;
  base_servings: number;
  is_freezable: boolean;
  ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[];
  steps: string[];
}

export function parseRecipeText(raw: string): ParsedRecipe {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  let name = '';
  let base_servings = 4;
  let is_freezable = false;
  const ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] = [];
  const steps: string[] = [];

  type Section = 'header' | 'ingredients' | 'steps';
  let section: Section = 'header';
  let nameFound = false;

  for (const line of lines) {
    // ── Detect freezable anywhere ──
    if (FREEZABLE_RE.test(line)) is_freezable = true;

    // ── Detect servings anywhere ──
    const sm = line.match(SERVINGS_RE) ?? line.match(SERVINGS_RE2);
    if (sm) { base_servings = parseInt(sm[1]); continue; }

    // ── Section transitions ──
    if (INGREDIENT_SECTION_RE.test(line)) { section = 'ingredients'; continue; }
    if (STEP_SECTION_RE.test(line)) { section = 'steps'; continue; }

    // ── Recipe name: first meaningful non-section line ──
    if (!nameFound && section === 'header' && line.length > 2) {
      name = line.replace(/^#\s*/, '').replace(/^\*+|\*+$/g, '').trim();
      nameFound = true;
      continue;
    }

    // ── Ingredient section ──
    if (section === 'ingredients') {
      const ing = parseLine(line);
      if (ing) ingredients.push(ing);
      continue;
    }

    // ── Steps section ──
    if (section === 'steps') {
      const stepText = line.replace(STEP_RE, '').trim();
      if (stepText.length > 3) steps.push(stepText);
      continue;
    }

    // ── Auto-detect when no explicit sections ──
    if (section === 'header') {
      // Looks like an ingredient?
      const ing = parseLine(line);
      if (ing) {
        section = 'ingredients';
        ingredients.push(ing);
        continue;
      }
      // Looks like a numbered step?
      if (STEP_RE.test(line)) {
        section = 'steps';
        const stepText = line.replace(STEP_RE, '').trim();
        if (stepText.length > 3) steps.push(stepText);
        continue;
      }
    }
  }

  // ── Fallbacks ──
  if (!name) name = 'Receta importada';

  return { name, base_servings, is_freezable, ingredients, steps };
}

function parseLine(line: string): Omit<Ingredient, 'id' | 'recipe_id'> | null {
  // Skip pure section headers or very short lines
  if (line.length < 2) return null;
  if (INGREDIENT_SECTION_RE.test(line) || STEP_SECTION_RE.test(line)) return null;

  // "al gusto"
  if (AL_GUSTO_RE.test(line)) {
    const nameRaw = line.replace(/[-•*–]/g, '').replace(AL_GUSTO_RE, '').replace(/^de\s+/i, '').trim();
    if (nameRaw.length > 1) return { name: cap(nameRaw), quantity: 0, unit: 'al gusto' };
  }

  // Full match with unit
  const m = line.match(INGREDIENT_RE);
  if (m?.groups?.name) {
    const qty = m.groups.qty ? parseFraction(m.groups.qty) : 0;
    const unit = UNIT_MAP[m.groups.unit.toLowerCase()] ?? 'unidad';
    const name = cap(m.groups.name.replace(/^de\s+/i, '').trim());
    if (name.length < 2) return null;
    return { name, quantity: qty, unit };
  }

  // Simple fallback: "2 huevos", "3 dientes de ajo"
  const s = line.match(SIMPLE_INGREDIENT_RE);
  if (s?.groups?.name) {
    const qty = s.groups.qty ? parseFraction(s.groups.qty) : 1;
    const name = cap(s.groups.name.trim());
    if (name.length < 2) return null;
    return { name, quantity: qty, unit: 'unidad' };
  }

  return null;
}

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
