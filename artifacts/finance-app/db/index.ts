import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const expo = SQLite.openDatabaseSync("fintrack.db", { enableChangeListener: true });

export const db = drizzle(expo, { schema });

/**
 * Initialize FTS5 virtual table and sync triggers.
 * Must be called after migrations are complete.
 */
export async function initializeFTS() {
    expo.execSync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
      description, note, category,
      content='transactions',
      content_rowid='id'
    );
  `);

    // Triggers to keep FTS index in sync with transactions table
    expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS transactions_ai AFTER INSERT ON transactions BEGIN
      INSERT INTO transactions_fts(rowid, description, note, category)
      VALUES (new.id, new.description, new.note, new.category);
    END;
  `);

    expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS transactions_ad AFTER DELETE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, description, note, category)
      VALUES ('delete', old.id, old.description, old.note, old.category);
    END;
  `);

    expo.execSync(`
    CREATE TRIGGER IF NOT EXISTS transactions_au AFTER UPDATE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, description, note, category)
      VALUES ('delete', old.id, old.description, old.note, old.category);
      INSERT INTO transactions_fts(rowid, description, note, category)
      VALUES (new.id, new.description, new.note, new.category);
    END;
  `);

    // Create performance indexes
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);`);
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);`);
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_tx_type_date ON transactions(type, date);`);
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, month, category);`);
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON ai_messages(conversation_id);`);
    expo.execSync(`CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(type, created_at);`);
}

/**
 * Search transactions using FTS5 full-text search.
 * Returns matching transaction IDs and snippets.
 */
export function searchTransactionsFTS(query: string) {
    return expo.getAllSync<{
        id: number;
        snippet: string;
    }>(
        `SELECT rowid as id, snippet(transactions_fts, 0, '<b>', '</b>', '...', 32) as snippet
     FROM transactions_fts
     WHERE transactions_fts MATCH ?
     ORDER BY rank
     LIMIT 50`,
        [query]
    );
}

export { expo as sqliteDb };
