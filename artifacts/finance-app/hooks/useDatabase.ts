/**
 * Web implementation of database hooks.
 * Uses localStorage for persistence (no SQLite/WASM needed).
 * Metro resolves this file on web; useDatabase.native.ts is used on iOS/Android.
 */
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  note: string | null;
  date: string;
  createdAt: string;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "fintrack_transactions_v1";
let _cache: Transaction[] | null = null;
// Global listeners so any hook can trigger re-renders across instances
const _listeners = new Set<() => void>();

function notifyAll() {
  _cache = null; // invalidate cache
  _listeners.forEach((fn) => fn());
}

function loadAll(): Transaction[] {
  if (_cache) return _cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    _cache = raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    _cache = [];
  }
  return _cache;
}

function saveAll(txs: Transaction[]) {
  _cache = txs;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    }
  } catch { }
}

let _nextId = -1;
function getNextId(txs: Transaction[]): number {
  if (_nextId < 0) {
    _nextId = txs.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  }
  return _nextId++;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  return { start, end };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── useTransactions ──────────────────────────────────────────────────────────

interface TransactionFilters {
  month?: number;
  year?: number;
  category?: string;
  type?: "income" | "expense";
  limit?: number;
  offset?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const [tick, setTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const all = loadAll();
  let result = all.slice();

  if (filters.month && filters.year) {
    const { start, end } = getMonthRange(filters.month, filters.year);
    result = result.filter((t) => t.date >= start && t.date < end);
  }
  if (filters.category) result = result.filter((t) => t.category === filters.category);
  if (filters.type) result = result.filter((t) => t.type === filters.type);

  result.sort((a, b) => b.date.localeCompare(a.date));

  const total = result.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit;
  const paged = limit ? result.slice(offset, offset + limit) : result.slice(offset);

  return { data: paged, total, isLoading, refetch: () => setTick((t) => t + 1) };
}

// ─── useAllTransactions ───────────────────────────────────────────────────────

export function useAllTransactions() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const all = loadAll().slice().sort((a, b) => b.date.localeCompare(a.date));
  return { data: all, isLoading: false, refetch: () => setTick((t) => t + 1) };
}

// ─── useCreateTransaction ─────────────────────────────────────────────────────

export function useCreateTransaction() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (data: {
    type: "income" | "expense";
    amount: number;
    description: string;
    category: string;
    note?: string;
    date: string;
  }) => {
    setIsPending(true);
    try {
      const all = loadAll();
      const newTx: Transaction = {
        id: getNextId(all),
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        note: data.note ?? null,
        date: data.date,
        createdAt: new Date().toISOString(),
      };
      saveAll([...all, newTx]);
      notifyAll();
      return newTx;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
}

// ─── useDeleteTransaction ─────────────────────────────────────────────────────

export function useDeleteTransaction() {
  const mutateAsync = useCallback(async (id: number) => {
    const all = loadAll().filter((t) => t.id !== id);
    saveAll(all);
    notifyAll();
  }, []);

  return { mutateAsync };
}

// ─── useSummary ───────────────────────────────────────────────────────────────

interface SummaryData {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  month: number;
  year: number;
}

export function useSummary(filters: { month?: number; year?: number } = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const now = new Date();
  const month = filters.month ?? now.getMonth() + 1;
  const year = filters.year ?? now.getFullYear();
  const { start, end } = getMonthRange(month, year);

  const all = loadAll().filter((t) => t.date >= start && t.date < end);
  const totalIncome = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const data: SummaryData = { balance: totalIncome - totalExpenses, totalIncome, totalExpenses, month, year };

  return { data, isLoading: false, refetch: () => setTick((t) => t + 1) };
}

// ─── useCategoryStats ─────────────────────────────────────────────────────────

interface CategoryStat {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export function useCategoryStats(filters: { month?: number; year?: number } = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const now = new Date();
  const month = filters.month ?? now.getMonth() + 1;
  const year = filters.year ?? now.getFullYear();
  const { start, end } = getMonthRange(month, year);

  const expenses = loadAll().filter(
    (t) => t.type === "expense" && t.date >= start && t.date < end
  );

  const map = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const existing = map.get(t.category) ?? { total: 0, count: 0 };
    map.set(t.category, { total: existing.total + t.amount, count: existing.count + 1 });
  }

  const grandTotal = expenses.reduce((s, t) => s + t.amount, 0);
  const data: CategoryStat[] = Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, { total, count }]) => ({
      category,
      total: Math.round(total * 100) / 100,
      count,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 10000) / 100 : 0,
    }));

  return { data, isLoading: false, refetch: () => setTick((t) => t + 1) };
}

// ─── useMonthlyStats ──────────────────────────────────────────────────────────

interface MonthlyStat {
  month: number;
  year: number;
  income: number;
  expenses: number;
  label: string;
}

export function useMonthlyStats(filters: { year?: number } = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const year = filters.year ?? new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd = new Date(year + 1, 0, 1).toISOString();

  const yearTxs = loadAll().filter((t) => t.date >= yearStart && t.date < yearEnd);

  const data: MonthlyStat[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const { start, end } = getMonthRange(m, year);
    const mTxs = yearTxs.filter((t) => t.date >= start && t.date < end);
    return {
      month: m,
      year,
      income: mTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expenses: mTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      label: MONTH_SHORT[i],
    };
  });

  return { data, isLoading: false, refetch: () => setTick((t) => t + 1) };
}
