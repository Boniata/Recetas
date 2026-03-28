import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const MIGRATION_KEY = 'migrated_to_firestore_v1';

export async function migrateFromLocalStorage(): Promise<boolean> {
  if (localStorage.getItem(MIGRATION_KEY)) return false;

  const collections = ['recipes', 'ingredients', 'steps', 'batches', 'mealPlan'];
  const data: Record<string, unknown[]> = {};

  let hasData = false;
  for (const key of collections) {
    try {
      data[key] = JSON.parse(localStorage.getItem(key) || '[]');
      if (data[key].length > 0) hasData = true;
    } catch {
      data[key] = [];
    }
  }

  if (!hasData) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return false;
  }

  // Check Firestore isn't already populated
  const existing = await getDocs(collection(db, 'recipes'));
  if (!existing.empty) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return false;
  }

  // Write everything in batches (Firestore max 500 per batch)
  const allDocs: { col: string; id: string; data: Record<string, unknown> }[] = [];
  for (const col of collections) {
    for (const item of data[col] as Record<string, unknown>[]) {
      if (item && item.id) {
        allDocs.push({ col, id: item.id as string, data: item });
      }
    }
  }

  for (let i = 0; i < allDocs.length; i += 400) {
    const batch = writeBatch(db);
    allDocs.slice(i, i + 400).forEach(({ col, id, data: d }) => {
      batch.set(doc(db, col, id), d);
    });
    await batch.commit();
  }

  localStorage.setItem(MIGRATION_KEY, 'true');
  return true;
}
