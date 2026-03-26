import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

type AppDB = ReturnType<typeof drizzle<typeof schema>>;

// ── Async singleton ──────────────────────────────────────────────────────────
// Using openDatabaseAsync for web compatibility (no SharedArrayBuffer needed).
// openDatabaseSync requires SharedArrayBuffer which isn't available in
// cross-origin-restricted browser environments like the Replit preview.

let _db: AppDB | null = null;
let _expo: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<{ db: AppDB; expo: SQLite.SQLiteDatabase }> | null = null;

export async function openDatabase() {
    if (_db && _expo) return { db: _db, expo: _expo };
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const expo = await SQLite.openDatabaseAsync("fintrack.db", {
            enableChangeListener: true,
        });
        const db = drizzle(expo as any, { schema });
        _db = db;
        _expo = expo as any;
        return { db, expo: expo as any };
    })();

    return _initPromise;
}

/** Returns the initialized DB — call after openDatabase() resolves */
export function getDb(): AppDB {
    if (!_db) throw new Error("Database not initialized. await openDatabase() first.");
    return _db;
}

/** The db promise — all hooks await this before running queries */
export const dbPromise: Promise<AppDB> = openDatabase().then((r) => r.db);

/**
 * Initialize FTS5 virtual table and sync triggers.
 * Must be called after DB is open and migrations complete.
 */
export async function initializeFTS() {
    const { expo } = await openDatabase();

    await expo.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
      description, note, category,
      content='transactions',
      content_rowid='id'
    );
  `);

    await expo.execAsync(`
    CREATE TRIGGER IF NOT EXISTS transactions_ai AFTER INSERT ON transactions BEGIN
      INSERT INTO transactions_fts(rowid, description, note, category)
      VALUES (new.id, new.description, new.note, new.category);
    END;
  `);

    await expo.execAsync(`
    CREATE TRIGGER IF NOT EXISTS transactions_ad AFTER DELETE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, description, note, category)
      VALUES ('delete', old.id, old.description, old.note, old.category);
    END;
  `);

    await expo.execAsync(`
    CREATE TRIGGER IF NOT EXISTS transactions_au AFTER UPDATE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, description, note, category)
      VALUES ('delete', old.id, old.description, old.note, old.category);
      INSERT INTO transactions_fts(rowid, description, note, category)
      VALUES (new.id, new.description, new.note, new.category);
    END;
  `);

    await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);`);
    await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);`);
    await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_tx_type_date ON transactions(type, date);`);
    // Best-effort for optional tables
    try {
        await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, month, category);`);
    } catch { }
    try {
        await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON ai_messages(conversation_id);`);
    } catch { }
    try {
        await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(type, created_at);`);
    } catch { }
}

/**
 * Full-text search over transactions using FTS5.
 */
export async function searchTransactionsFTS(query: string) {
    const { expo } = await openDatabase();
    return expo.getAllAsync<{ id: number; snippet: string }>(
        `SELECT rowid as id, snippet(transactions_fts, 0, '<b>', '</b>', '...', 32) as snippet
     FROM transactions_fts
     WHERE transactions_fts MATCH ?
     ORDER BY rank
     LIMIT 50`,
        [query]
    );
}

export { type AppDB };
