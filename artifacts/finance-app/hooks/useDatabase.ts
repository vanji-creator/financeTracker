/**
 * Core database hooks for transaction CRUD, financial summary, and statistics.
 * Replaces the remote API client with local SQLite queries via Drizzle ORM.
 */
import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import { transactions, type Transaction, type InsertTransaction } from "@/db/schema";
import { eq, and, gte, lt, desc, sql, asc } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthRange(month: number, year: number) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    return { start, end };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Transactions CRUD ───────────────────────────────────────────────────────

interface TransactionFilters {
    month?: number;
    year?: number;
    category?: string;
    type?: "income" | "expense";
    limit?: number;
    offset?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
    const [data, setData] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const conditions: ReturnType<typeof eq>[] = [];

            if (filters.month && filters.year) {
                const { start, end } = getMonthRange(filters.month, filters.year);
                conditions.push(gte(transactions.date, start) as any);
                conditions.push(lt(transactions.date, end) as any);
            }
            if (filters.category) {
                conditions.push(eq(transactions.category, filters.category));
            }
            if (filters.type) {
                conditions.push(eq(transactions.type, filters.type));
            }

            const where = conditions.length > 0 ? and(...conditions) : undefined;

            // Get total count
            const [countResult] = await db
                .select({ count: sql<number>`count(*)` })
                .from(transactions)
                .where(where);
            setTotal(countResult?.count ?? 0);

            // Get paginated results
            let query = db
                .select()
                .from(transactions)
                .where(where)
                .orderBy(desc(transactions.date));

            if (filters.limit) {
                query = query.limit(filters.limit) as any;
            }
            if (filters.offset) {
                query = query.offset(filters.offset) as any;
            }

            const results = await query;
            setData(results);
        } catch (err) {
            console.error("Error fetching transactions:", err);
        } finally {
            setIsLoading(false);
        }
    }, [filters.month, filters.year, filters.category, filters.type, filters.limit, filters.offset]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, total, isLoading, refetch: refresh };
}

export function useAllTransactions() {
    const [data, setData] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const results = await db
                .select()
                .from(transactions)
                .orderBy(desc(transactions.date));
            setData(results);
        } catch (err) {
            console.error("Error fetching all transactions:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, isLoading, refetch: refresh };
}

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
            const [created] = await db
                .insert(transactions)
                .values({
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    category: data.category,
                    note: data.note ?? null,
                    date: data.date,
                    createdAt: new Date().toISOString(),
                })
                .returning();
            return created;
        } finally {
            setIsPending(false);
        }
    }, []);

    return { mutateAsync, isPending };
}

export function useDeleteTransaction() {
    const mutateAsync = useCallback(async (id: number) => {
        await db.delete(transactions).where(eq(transactions.id, id));
    }, []);

    return { mutateAsync };
}

// ─── Financial Summary ───────────────────────────────────────────────────────

interface SummaryData {
    balance: number;
    totalIncome: number;
    totalExpenses: number;
    month: number;
    year: number;
}

export function useSummary(filters: { month?: number; year?: number } = {}) {
    const [data, setData] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const now = new Date();
    const month = filters.month ?? now.getMonth() + 1;
    const year = filters.year ?? now.getFullYear();

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const { start, end } = getMonthRange(month, year);

            const result = await db
                .select({
                    totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
                    totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
                })
                .from(transactions)
                .where(and(gte(transactions.date, start), lt(transactions.date, end)));

            const totalIncome = Number(result[0]?.totalIncome ?? 0);
            const totalExpenses = Number(result[0]?.totalExpenses ?? 0);

            setData({
                balance: totalIncome - totalExpenses,
                totalIncome,
                totalExpenses,
                month,
                year,
            });
        } catch (err) {
            console.error("Error fetching summary:", err);
        } finally {
            setIsLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, isLoading, refetch: refresh };
}

// ─── Category Stats ──────────────────────────────────────────────────────────

interface CategoryStat {
    category: string;
    total: number;
    count: number;
    percentage: number;
}

export function useCategoryStats(filters: { month?: number; year?: number } = {}) {
    const [data, setData] = useState<CategoryStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const now = new Date();
    const month = filters.month ?? now.getMonth() + 1;
    const year = filters.year ?? now.getFullYear();

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const { start, end } = getMonthRange(month, year);

            const result = await db
                .select({
                    category: transactions.category,
                    total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
                    count: sql<number>`COUNT(*)`,
                })
                .from(transactions)
                .where(
                    and(
                        eq(transactions.type, "expense"),
                        gte(transactions.date, start),
                        lt(transactions.date, end)
                    )
                )
                .groupBy(transactions.category)
                .orderBy(sql`SUM(${transactions.amount}) DESC`);

            const grandTotal = result.reduce((sum, r) => sum + Number(r.total), 0);

            setData(
                result.map((r) => ({
                    category: r.category,
                    total: Math.round(Number(r.total) * 100) / 100,
                    count: Number(r.count),
                    percentage: grandTotal > 0 ? Math.round((Number(r.total) / grandTotal) * 10000) / 100 : 0,
                }))
            );
        } catch (err) {
            console.error("Error fetching category stats:", err);
        } finally {
            setIsLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, isLoading, refetch: refresh };
}

// ─── Monthly Stats ───────────────────────────────────────────────────────────

interface MonthlyStat {
    month: number;
    year: number;
    income: number;
    expenses: number;
    label: string;
}

export function useMonthlyStats(filters: { year?: number } = {}) {
    const [data, setData] = useState<MonthlyStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const year = filters.year ?? new Date().getFullYear();

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const yearStart = new Date(year, 0, 1).toISOString();
            const yearEnd = new Date(year + 1, 0, 1).toISOString();

            // Single aggregation query for all 12 months!
            const result = await db
                .select({
                    month: sql<number>`CAST(strftime('%m', ${transactions.date}) AS INTEGER)`,
                    income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
                    expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
                })
                .from(transactions)
                .where(and(gte(transactions.date, yearStart), lt(transactions.date, yearEnd)))
                .groupBy(sql`strftime('%m', ${transactions.date})`);

            // Fill in all 12 months (months with no data get zeros)
            const monthMap = new Map(result.map((r) => [Number(r.month), r]));

            const months: MonthlyStat[] = [];
            for (let m = 1; m <= 12; m++) {
                const row = monthMap.get(m);
                months.push({
                    month: m,
                    year,
                    income: Number(row?.income ?? 0),
                    expenses: Number(row?.expenses ?? 0),
                    label: MONTH_SHORT[m - 1],
                });
            }

            setData(months);
        } catch (err) {
            console.error("Error fetching monthly stats:", err);
        } finally {
            setIsLoading(false);
        }
    }, [year]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, isLoading, refetch: refresh };
}
