/**
 * Web stub for db/index.
 * On web, expo-sqlite requires OPFS/SharedArrayBuffer (COOP/COEP headers)
 * which are stripped by the Replit proxy. This stub provides a no-op
 * compatible API so _layout.tsx initialises without crashing.
 * All real data access on web goes through hooks/useDatabase.ts (localStorage).
 */

export type AppDB = any;

export async function openDatabase() {
  return { db: null as AppDB, expo: null as any };
}

export function getDb(): AppDB {
  return null;
}

export const dbPromise: Promise<AppDB> = Promise.resolve(null);

export async function initializeFTS() {}

export async function searchTransactionsFTS(_query: string) {
  return [];
}
