import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface DailyEntry {
  id?: string; // Unique ID (optional für Rückwärtskompatibilität, in DB immer gesetzt)
  date: string; // YYYY-MM-DD
  updatedAt?: number; // Zeitstempel der letzten Änderung (in DB immer gesetzt)
  morning?: {
    energy: number; // 1-5
    body: string[]; // ['fit', 'müde', etc.]
    intention: string;
    timestamp: number;
  };
  evening?: {
    mood: number; // 1-5
    habits: { [habitId: string]: boolean }; // habitId -> completed
    social: 'restorative' | 'draining' | 'neutral' | 'none';
    gratitude: string[];
    promptId: string;
    promptQuestion: string;
    notes: string;
    timestamp: number;
  };
}

export interface Habit {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  archivedAt: number | null;
  updatedAt?: number; // Zeitstempel der letzten Änderung
}

export interface MonthlyGoal {
  id: string;
  text: string;
  achieved: boolean | null; // null = in progress, true = yes, false = no
  review?: string;
}

export interface MonthlyReview {
  month: string; // YYYY-MM
  goals: MonthlyGoal[];
  notes?: string;
  updatedAt?: number; // Zeitstempel der letzten Änderung
}

interface RootedDB extends DBSchema {
  entries: {
    key: string;
    value: DailyEntry;
    indexes: {
      date: string;
    };
  };
  habits: {
    key: string;
    value: Habit;
  };
  goals: {
    key: string;
    value: MonthlyReview;
  };
}

const DB_NAME = 'rooted_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<RootedDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RootedDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RootedDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore('habits', { keyPath: 'id' });
          db.createObjectStore('goals', { keyPath: 'month' });
        }
        
        if (oldVersion < 2) {
          let existingEntries: any[] = [];
          
          if (db.objectStoreNames.contains('entries')) {
            const store = transaction.objectStore('entries');
            existingEntries = await store.getAll();
            db.deleteObjectStore('entries');
          }
          
          const newStore = db.createObjectStore('entries', { keyPath: 'id' });
          newStore.createIndex('date', 'date', { unique: false });
          
          // Bestehende Einträge migrieren und IDs/Zeitstempel hinzufügen
          for (const entry of existingEntries) {
            const morningTs = entry.morning?.timestamp || 0;
            const eveningTs = entry.evening?.timestamp || 0;
            const fallbackTs = Math.max(morningTs, eveningTs) || Date.now();
            
            const migratedEntry: DailyEntry = {
              ...entry,
              id: entry.id || 'e_' + Math.random().toString(36).substring(2, 11) + '_' + fallbackTs.toString(36),
              updatedAt: entry.updatedAt || fallbackTs
            };
            await transaction.objectStore('entries').put(migratedEntry);
          }
        }
      },
    });
  }
  return dbPromise;
}

// Default Habits to initialize if none exist
const DEFAULT_HABITS: Habit[] = [
  { id: 'h_1', name: 'Meditation / Achtsames Atmen', active: true, createdAt: Date.now(), archivedAt: null, updatedAt: Date.now() },
  { id: 'h_2', name: 'Bewegung / Dehnen / Sport', active: true, createdAt: Date.now(), archivedAt: null, updatedAt: Date.now() },
  { id: 'h_3', name: 'Ausreichend Wasser trinken', active: true, createdAt: Date.now(), archivedAt: null, updatedAt: Date.now() },
  { id: 'h_4', name: 'Draußen an der frischen Luft sein', active: true, createdAt: Date.now(), archivedAt: null, updatedAt: Date.now() },
];

export async function initDefaultHabits(): Promise<void> {
  const db = await getDB();
  const allHabits = await db.getAll('habits');
  if (allHabits.length === 0) {
    const tx = db.transaction('habits', 'readwrite');
    for (const habit of DEFAULT_HABITS) {
      await tx.store.put(habit);
    }
    await tx.done;
  }
}

// Entries logic
export async function getEntry(date: string): Promise<DailyEntry | undefined> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('entries', 'date', date);
  if (entries.length === 0) return undefined;
  if (entries.length === 1) return entries[0];
  
  // Falls mehrere Einträge für denselben Tag existieren, liefere den neuesten zurück
  return entries.reduce((prev, current) => 
    (prev.updatedAt || 0) > (current.updatedAt || 0) ? prev : current
  );
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const db = await getDB();
  if (!entry.id) {
    entry.id = 'e_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }
  entry.updatedAt = Date.now();
  await db.put('entries', entry);
}

export async function getAllEntries(): Promise<DailyEntry[]> {
  const db = await getDB();
  return db.getAll('entries');
}

// Habits logic
export async function getActiveHabits(): Promise<Habit[]> {
  const db = await getDB();
  const all = await db.getAll('habits');
  return all.filter(h => h.active);
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDB();
  return db.getAll('habits');
}

export async function addHabit(name: string): Promise<Habit> {
  const db = await getDB();
  const habit: Habit = {
    id: 'h_' + Math.random().toString(36).substring(2, 11),
    name,
    active: true,
    createdAt: Date.now(),
    archivedAt: null,
    updatedAt: Date.now()
  };
  await db.put('habits', habit);
  return habit;
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDB();
  const habit = await db.get('habits', id);
  if (habit) {
    habit.active = false;
    habit.archivedAt = Date.now();
    habit.updatedAt = Date.now();
    await db.put('habits', habit);
  }
}

export async function reactivateHabit(id: string): Promise<void> {
  const db = await getDB();
  const habit = await db.get('habits', id);
  if (habit) {
    habit.active = true;
    habit.archivedAt = null;
    habit.updatedAt = Date.now();
    await db.put('habits', habit);
  }
}

// Goals logic
export async function getMonthlyReview(month: string): Promise<MonthlyReview | undefined> {
  const db = await getDB();
  return db.get('goals', month);
}

export async function saveMonthlyReview(review: MonthlyReview): Promise<void> {
  const db = await getDB();
  review.updatedAt = Date.now();
  await db.put('goals', review);
}

export async function getAllMonthlyReviews(): Promise<MonthlyReview[]> {
  const db = await getDB();
  return db.getAll('goals');
}

// --- MERGE LOGIK FÜR SYNC & MANUELLEN IMPORT ---
export interface ImportPayload {
  entries: DailyEntry[];
  habits: Habit[];
  goals: MonthlyReview[];
}

export async function mergeAndSaveImportedData(importedData: {
  entries?: DailyEntry[];
  habits?: Habit[];
  goals?: MonthlyReview[];
}): Promise<{ entriesMerged: number; habitsMerged: number; goalsMerged: number }> {
  const db = await getDB();
  
  let entriesMerged = 0;
  let habitsMerged = 0;
  let goalsMerged = 0;

  // 1. --- MELDEN & MERGEN VON EINTRÄGEN ---
  if (importedData.entries && importedData.entries.length > 0) {
    const localEntries = await getAllEntries();
    const entryMap = new Map<string, DailyEntry>();
    const obsoleteIds = new Set<string>();

    const normalize = (e: DailyEntry): DailyEntry => {
      const morningTs = e.morning?.timestamp || 0;
      const eveningTs = e.evening?.timestamp || 0;
      const fallbackTs = Math.max(morningTs, eveningTs) || Date.now();
      return {
        ...e,
        id: e.id || `e_${e.date}_${Math.random().toString(36).substring(2, 7)}`,
        updatedAt: e.updatedAt || fallbackTs
      };
    };

    // Lokale Einträge in Map laden
    for (const e of localEntries) {
      const normalized = normalize(e);
      entryMap.set(normalized.id!, normalized);
    }

    // Importierte Einträge hinzufügen, Dubletten mit gleicher ID auflösen (neuesten behalten)
    for (const e of importedData.entries) {
      const normalized = normalize(e);
      const existing = entryMap.get(normalized.id!);
      if (!existing || (normalized.updatedAt || 0) > (existing.updatedAt || 0)) {
        entryMap.set(normalized.id!, normalized);
        if (existing) {
          entriesMerged++;
        }
      }
    }

    // Nach Datum gruppieren, um Einträge am gleichen Tag mit unterschiedlichen IDs zu verschmelzen
    const dateGroups = new Map<string, DailyEntry[]>();
    for (const e of entryMap.values()) {
      if (!dateGroups.has(e.date)) {
        dateGroups.set(e.date, []);
      }
      dateGroups.get(e.date)!.push(e);
    }

    const finalEntries: DailyEntry[] = [];

    for (const [date, list] of dateGroups.entries()) {
      if (list.length === 1) {
        finalEntries.push(list[0]);
      } else {
        // Mehrere Einträge am selben Tag mit unterschiedlichen IDs -> Mergen!
        // Nach updatedAt sortieren (aufsteigend), damit wir in den neuesten mergen
        list.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        
        let merged = list[0];
        for (let i = 1; i < list.length; i++) {
          const next = list[i];
          
          // Morning-Daten zusammenführen (den neuesten behalten)
          let morning = merged.morning;
          if (next.morning) {
            if (!morning || next.morning.timestamp > morning.timestamp) {
              morning = next.morning;
            }
          }
          
          // Evening-Daten zusammenführen (den neuesten behalten)
          let evening = merged.evening;
          if (next.evening) {
            if (!evening || next.evening.timestamp > evening.timestamp) {
              evening = next.evening;
            }
          }
          
          // Die alte ID (merged.id) wird verworfen (gelöscht), da sie in 'next.id' aufgeht
          obsoleteIds.add(merged.id!);
          
          merged = {
            id: next.id,
            date: date,
            morning,
            evening,
            updatedAt: Math.max(merged.updatedAt || 0, next.updatedAt || 0)
          };
        }
        
        finalEntries.push(merged);
        entriesMerged++;
      }
    }

    // In einer Transaktion speichern und veraltete IDs löschen
    const tx = db.transaction('entries', 'readwrite');
    for (const e of finalEntries) {
      await tx.store.put(e);
    }
    for (const id of obsoleteIds) {
      await tx.store.delete(id);
    }
    await tx.done;
  }

  // 2. --- MERGEN VON HABITS ---
  if (importedData.habits && importedData.habits.length > 0) {
    const localHabits = await getAllHabits();
    const habitMap = new Map<string, Habit>();

    for (const h of localHabits) {
      habitMap.set(h.id, h);
    }

    for (const h of importedData.habits) {
      const existing = habitMap.get(h.id);
      const importUpdated = h.updatedAt || h.createdAt || 0;
      const localUpdated = existing ? (existing.updatedAt || existing.createdAt || 0) : 0;
      
      if (!existing || importUpdated > localUpdated) {
        habitMap.set(h.id, {
          ...h,
          updatedAt: importUpdated
        });
        if (existing) {
          habitsMerged++;
        }
      }
    }

    const tx = db.transaction('habits', 'readwrite');
    for (const h of habitMap.values()) {
      await tx.store.put(h);
    }
    await tx.done;
  }

  // 3. --- MERGEN VON MONTHLY GOALS ---
  if (importedData.goals && importedData.goals.length > 0) {
    const localGoals = await db.getAll('goals');
    const goalsMap = new Map<string, MonthlyReview>();

    for (const g of localGoals) {
      goalsMap.set(g.month, g);
    }

    for (const g of importedData.goals) {
      const existing = goalsMap.get(g.month);
      const importUpdated = g.updatedAt || 0;
      const localUpdated = existing ? (existing.updatedAt || 0) : 0;
      
      if (!existing || importUpdated > localUpdated) {
        goalsMap.set(g.month, {
          ...g,
          updatedAt: importUpdated
        });
        if (existing) {
          goalsMerged++;
        }
      }
    }

    const tx = db.transaction('goals', 'readwrite');
    for (const g of goalsMap.values()) {
      await tx.store.put(g);
    }
    await tx.done;
  }

  return { entriesMerged, habitsMerged, goalsMerged };
}
