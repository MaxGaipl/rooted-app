import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface DailyEntry {
  date: string; // YYYY-MM-DD
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
}

interface RootedDB extends DBSchema {
  entries: {
    key: string;
    value: DailyEntry;
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
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RootedDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RootedDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RootedDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('entries', { keyPath: 'date' });
        db.createObjectStore('habits', { keyPath: 'id' });
        db.createObjectStore('goals', { keyPath: 'month' });
      },
    });
  }
  return dbPromise;
}

// Default Habits to initialize if none exist
const DEFAULT_HABITS: Habit[] = [
  { id: 'h_1', name: 'Meditation / Achtsames Atmen', active: true, createdAt: Date.now(), archivedAt: null },
  { id: 'h_2', name: 'Bewegung / Dehnen / Sport', active: true, createdAt: Date.now(), archivedAt: null },
  { id: 'h_3', name: 'Ausreichend Wasser trinken', active: true, createdAt: Date.now(), archivedAt: null },
  { id: 'h_4', name: 'Draußen an der frischen Luft sein', active: true, createdAt: Date.now(), archivedAt: null },
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
  return db.get('entries', date);
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const db = await getDB();
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
    archivedAt: null
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
    await db.put('habits', habit);
  }
}

export async function reactivateHabit(id: string): Promise<void> {
  const db = await getDB();
  const habit = await db.get('habits', id);
  if (habit) {
    habit.active = true;
    habit.archivedAt = null;
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
  await db.put('goals', review);
}
