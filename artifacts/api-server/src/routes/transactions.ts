import { Router, type IRouter } from "express";
import { db, transactionsTable, insertTransactionSchema } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { GetTransactionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// GET /transactions
router.get("/transactions", async (req, res) => {
  try {
    const query = GetTransactionsQueryParams.safeParse({
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      category: req.query.category,
      type: req.query.type,
    });

    const conditions: ReturnType<typeof eq>[] = [];

    if (query.success) {
      if (query.data.month && query.data.year) {
        const { start, end } = getMonthRange(query.data.month, query.data.year);
        conditions.push(gte(transactionsTable.date, start) as any);
        conditions.push(lt(transactionsTable.date, end) as any);
      }
      if (query.data.category) {
        conditions.push(eq(transactionsTable.category, query.data.category as any));
      }
      if (query.data.type) {
        conditions.push(eq(transactionsTable.type, query.data.type as any));
      }
    }

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactionsTable.date));

    res.json(
      transactions.map((t) => ({
        ...t,
        amount: parseFloat(t.amount),
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching transactions");
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST /transactions
router.post("/transactions", async (req, res) => {
  try {
    const body = insertTransactionSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body", details: body.error });
      return;
    }

    const { type, amount, description, category, note, date } = body.data;

    const [created] = await db
      .insert(transactionsTable)
      .values({
        type: type as "income" | "expense",
        amount: amount.toString(),
        description,
        category: category as any,
        note: note ?? null,
        date: new Date(date),
      })
      .returning();

    res.status(201).json({
      ...created,
      amount: parseFloat(created.amount),
      date: created.date.toISOString(),
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating transaction");
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// GET /transactions/:id
router.get("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [transaction] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id));

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json({
      ...transaction,
      amount: parseFloat(transaction.amount),
      date: transaction.date.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching transaction");
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// DELETE /transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting transaction");
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// GET /summary
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const { start, end } = getMonthRange(month, year);

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(and(gte(transactionsTable.date, start), lt(transactionsTable.date, end)));

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (row.type === "income") {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    }

    res.json({
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      month,
      year,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching summary");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// GET /stats/categories
router.get("/stats/categories", async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const { start, end } = getMonthRange(month, year);

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, "expense"),
          gte(transactionsTable.date, start),
          lt(transactionsTable.date, end)
        )
      );

    const categoryMap: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (!categoryMap[row.category]) {
        categoryMap[row.category] = { total: 0, count: 0 };
      }
      categoryMap[row.category].total += amount;
      categoryMap[row.category].count += 1;
      grandTotal += amount;
    }

    const stats = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 10000) / 100 : 0,
    }));

    stats.sort((a, b) => b.total - a.total);
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Error fetching category stats");
    res.status(500).json({ error: "Failed to fetch category stats" });
  }
});

// GET /stats/monthly
router.get("/stats/monthly", async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const { start, end } = getMonthRange(m, year);
      const rows = await db
        .select()
        .from(transactionsTable)
        .where(and(gte(transactionsTable.date, start), lt(transactionsTable.date, end)));

      let income = 0;
      let expenses = 0;
      for (const row of rows) {
        const amount = parseFloat(row.amount);
        if (row.type === "income") income += amount;
        else expenses += amount;
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      months.push({ month: m, year, income, expenses, label: monthNames[m - 1] });
    }

    res.json(months);
  } catch (err) {
    req.log.error({ err }, "Error fetching monthly stats");
    res.status(500).json({ error: "Failed to fetch monthly stats" });
  }
});

export default router;
