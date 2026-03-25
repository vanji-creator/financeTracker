/**
 * Local On-Device Finance AI Engine
 * Zero API calls. Runs entirely on the device using pure JavaScript.
 * Uses pattern matching + statistical analysis to answer financial questions.
 */

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  note?: string | null;
  date: string;
}

export interface AIResponse {
  answer: string;
  insights?: Insight[];
  chartData?: { label: string; value: number; color: string }[];
}

export interface Insight {
  icon: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function txDate(tx: Transaction) {
  return new Date(tx.date);
}

function filterByMonth(txs: Transaction[], month: number, year: number) {
  return txs.filter((tx) => {
    const d = txDate(tx);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}

function filterByYear(txs: Transaction[], year: number) {
  return txs.filter((tx) => txDate(tx).getFullYear() === year);
}

function expenses(txs: Transaction[]) {
  return txs.filter((tx) => tx.type === "expense");
}

function incomes(txs: Transaction[]) {
  return txs.filter((tx) => tx.type === "income");
}

function sum(txs: Transaction[]) {
  return txs.reduce((s, tx) => s + tx.amount, 0);
}

function groupByCategory(txs: Transaction[]) {
  const map: Record<string, { total: number; count: number }> = {};
  for (const tx of txs) {
    if (!map[tx.category]) map[tx.category] = { total: 0, count: 0 };
    map[tx.category].total += tx.amount;
    map[tx.category].count += 1;
  }
  return Object.entries(map)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#F97316",
  Shopping: "#EC4899",
  Transportation: "#3B82F6",
  Housing: "#8B5CF6",
  Healthcare: "#10B981",
  Entertainment: "#F59E0B",
  Travel: "#06B6D4",
  Salary: "#22C55E",
  Freelance: "#84CC16",
  Investment: "#14B8A6",
  Other: "#94A3B8",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#94A3B8";
}

// ─── Date parsing from query ──────────────────────────────────────────────────

interface DateContext {
  month: number;
  year: number;
  label: string;
}

function extractDateContext(q: string, now: Date): DateContext {
  const qLow = q.toLowerCase();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  if (qLow.includes("last month")) {
    const m = curMonth === 1 ? 12 : curMonth - 1;
    const y = curMonth === 1 ? curYear - 1 : curYear;
    return { month: m, year: y, label: MONTH_NAMES[m - 1] };
  }

  if (qLow.includes("last year")) {
    return { month: 0, year: curYear - 1, label: String(curYear - 1) };
  }

  // Detect month names
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (
      qLow.includes(MONTH_NAMES[i].toLowerCase()) ||
      qLow.includes(MONTH_SHORT[i].toLowerCase())
    ) {
      const y = qLow.includes(String(curYear - 1)) ? curYear - 1 : curYear;
      return { month: i + 1, year: y, label: `${MONTH_NAMES[i]} ${y}` };
    }
  }

  return { month: curMonth, year: curYear, label: MONTH_NAMES[curMonth - 1] };
}

// ─── Category extraction ──────────────────────────────────────────────────────

const CATEGORY_ALIASES: Record<string, string> = {
  food: "Food",
  groceries: "Food",
  grocery: "Food",
  restaurant: "Food",
  dining: "Food",
  eat: "Food",
  eating: "Food",
  coffee: "Food",
  lunch: "Food",
  dinner: "Food",
  breakfast: "Food",
  shopping: "Shopping",
  clothes: "Shopping",
  clothing: "Shopping",
  amazon: "Shopping",
  online: "Shopping",
  transport: "Transportation",
  transportation: "Transportation",
  uber: "Transportation",
  lyft: "Transportation",
  gas: "Transportation",
  fuel: "Transportation",
  commute: "Transportation",
  taxi: "Transportation",
  transit: "Transportation",
  car: "Transportation",
  housing: "Housing",
  rent: "Housing",
  mortgage: "Housing",
  utilities: "Housing",
  electricity: "Housing",
  electric: "Housing",
  water: "Housing",
  internet: "Housing",
  health: "Healthcare",
  healthcare: "Healthcare",
  medical: "Healthcare",
  doctor: "Healthcare",
  pharmacy: "Healthcare",
  medicine: "Healthcare",
  gym: "Healthcare",
  fitness: "Healthcare",
  entertainment: "Entertainment",
  netflix: "Entertainment",
  spotify: "Entertainment",
  movie: "Entertainment",
  movies: "Entertainment",
  games: "Entertainment",
  gaming: "Entertainment",
  travel: "Travel",
  vacation: "Travel",
  flight: "Travel",
  hotel: "Travel",
  airbnb: "Travel",
  salary: "Salary",
  paycheck: "Salary",
  wage: "Salary",
  freelance: "Freelance",
  client: "Freelance",
  consulting: "Freelance",
  investment: "Investment",
  dividend: "Investment",
  stock: "Investment",
  crypto: "Investment",
};

function extractCategory(q: string): string | null {
  const words = q.toLowerCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (CATEGORY_ALIASES[clean]) return CATEGORY_ALIASES[clean];
  }
  return null;
}

// ─── Query intent detection ───────────────────────────────────────────────────

type Intent =
  | "spending_category"
  | "income_total"
  | "expense_total"
  | "balance"
  | "biggest_expense"
  | "biggest_income"
  | "savings_rate"
  | "monthly_trend"
  | "breakdown"
  | "compare_months"
  | "top_transactions"
  | "transaction_search"
  | "advice"
  | "general";

function detectIntent(q: string): Intent {
  const qLow = q.toLowerCase();

  if (
    (qLow.includes("spend") || qLow.includes("spent") || qLow.includes("cost") || qLow.includes("paid")) &&
    extractCategory(qLow) !== null
  )
    return "spending_category";

  if (
    qLow.includes("biggest expense") ||
    qLow.includes("largest expense") ||
    qLow.includes("most expensive") ||
    qLow.includes("top expense")
  )
    return "biggest_expense";

  if (qLow.includes("biggest income") || qLow.includes("largest income") || qLow.includes("top income"))
    return "biggest_income";

  if (qLow.includes("balance") || qLow.includes("net") || qLow.includes("left over"))
    return "balance";

  if (
    qLow.includes("income") ||
    qLow.includes("earn") ||
    qLow.includes("made") ||
    qLow.includes("salary") ||
    qLow.includes("revenue")
  )
    return "income_total";

  if (
    qLow.includes("save") ||
    qLow.includes("saving") ||
    qLow.includes("savings rate") ||
    qLow.includes("saved")
  )
    return "savings_rate";

  if (
    qLow.includes("breakdown") ||
    qLow.includes("category") ||
    qLow.includes("categories") ||
    qLow.includes("where am i spending") ||
    qLow.includes("split") ||
    qLow.includes("distribution")
  )
    return "breakdown";

  if (qLow.includes("compare") || qLow.includes("vs") || qLow.includes("versus") || qLow.includes("month over month"))
    return "compare_months";

  if (qLow.includes("trend") || qLow.includes("monthly") || qLow.includes("over time") || qLow.includes("history"))
    return "monthly_trend";

  if (
    qLow.includes("advice") ||
    qLow.includes("suggest") ||
    qLow.includes("tip") ||
    qLow.includes("should i") ||
    qLow.includes("improve") ||
    qLow.includes("better")
  )
    return "advice";

  if (qLow.includes("top") || qLow.includes("recent") || qLow.includes("latest") || qLow.includes("last"))
    return "top_transactions";

  if (
    qLow.includes("spend") ||
    qLow.includes("spent") ||
    qLow.includes("expense") ||
    qLow.includes("total expense") ||
    qLow.includes("how much did i spend")
  )
    return "expense_total";

  return "general";
}

// ─── Intent handlers ──────────────────────────────────────────────────────────

function handleSpendingCategory(
  txs: Transaction[],
  q: string,
  ctx: DateContext
): AIResponse {
  const category = extractCategory(q)!;
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const catTxs = expenses(filtered).filter((tx) => tx.category === category);
  const total = sum(catTxs);
  const totalExpenses = sum(expenses(filtered));
  const pctOfTotal = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

  if (catTxs.length === 0) {
    return {
      answer: `You had no ${category} expenses in ${ctx.label}. Your records show no transactions in this category for that period.`,
    };
  }

  const topTx = catTxs.reduce((a, b) => (a.amount > b.amount ? a : b));
  const avgTx = total / catTxs.length;

  return {
    answer: `In ${ctx.label}, you spent ${fmt(total)} on ${category} across ${catTxs.length} transaction${catTxs.length > 1 ? "s" : ""}. That's ${pctOfTotal.toFixed(1)}% of your total expenses this period. Your largest ${category} transaction was "${topTx.description}" at ${fmt(topTx.amount)}, and your average transaction was ${fmt(avgTx)}.`,
    insights: [
      { icon: "dollar-sign", label: `${category} Total`, value: fmt(total), trend: "neutral" },
      { icon: "percent", label: "Of Total Expenses", value: `${pctOfTotal.toFixed(1)}%`, trend: "neutral" },
      { icon: "trending-up", label: "Avg Transaction", value: fmt(avgTx), trend: "neutral" },
      { icon: "alert-circle", label: "Largest Transaction", value: fmt(topTx.amount), trend: "neutral" },
    ],
  };
}

function handleExpenseTotal(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const exp = expenses(filtered);
  const total = sum(exp);
  const categoryBreakdown = groupByCategory(exp).slice(0, 3);

  const prevMonth = ctx.month === 1 ? 12 : ctx.month - 1;
  const prevYear = ctx.month === 1 ? ctx.year - 1 : ctx.year;
  const prevFiltered = filterByMonth(txs, prevMonth, prevYear);
  const prevTotal = sum(expenses(prevFiltered));
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

  const topCategory = categoryBreakdown[0];

  let answer = `Your total expenses in ${ctx.label} were ${fmt(total)} across ${exp.length} transactions.`;
  if (prevTotal > 0) {
    answer += ` That's ${Math.abs(change).toFixed(1)}% ${change >= 0 ? "more" : "less"} than ${MONTH_NAMES[prevMonth - 1]}.`;
  }
  if (topCategory) {
    answer += ` Your biggest spending category was ${topCategory.category} at ${fmt(topCategory.total)}.`;
  }

  return {
    answer,
    insights: [
      { icon: "trending-down", label: "Total Expenses", value: fmt(total), trend: "neutral" },
      { icon: "hash", label: "Transactions", value: String(exp.length), trend: "neutral" },
      ...(prevTotal > 0
        ? [{ icon: "bar-chart-2", label: "vs Last Month", value: pct(change), trend: (change <= 0 ? "down" : "up") as "up" | "down" }]
        : []),
    ],
    chartData: categoryBreakdown.map((c) => ({
      label: c.category,
      value: c.total,
      color: categoryColor(c.category),
    })),
  };
}

function handleIncomeTotal(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const inc = incomes(filtered);
  const total = sum(inc);

  const prevMonth = ctx.month === 1 ? 12 : ctx.month - 1;
  const prevYear = ctx.month === 1 ? ctx.year - 1 : ctx.year;
  const prevFiltered = filterByMonth(txs, prevMonth, prevYear);
  const prevTotal = sum(incomes(prevFiltered));
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

  const sources = groupByCategory(inc);

  let answer = `Your total income in ${ctx.label} was ${fmt(total)} from ${inc.length} source${inc.length !== 1 ? "s" : ""}.`;
  if (sources.length > 0) answer += ` Primary source: ${sources[0].category} (${fmt(sources[0].total)}).`;
  if (prevTotal > 0)
    answer += ` Compared to ${MONTH_NAMES[prevMonth - 1]}, that's ${Math.abs(change).toFixed(1)}% ${change >= 0 ? "higher" : "lower"}.`;

  return {
    answer,
    insights: [
      { icon: "trending-up", label: "Total Income", value: fmt(total), trend: "up" },
      { icon: "hash", label: "Sources", value: String(inc.length), trend: "neutral" },
      ...(prevTotal > 0
        ? [{ icon: "bar-chart-2", label: "vs Last Month", value: pct(change), trend: (change >= 0 ? "up" : "down") as "up" | "down" }]
        : []),
    ],
  };
}

function handleBalance(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const totalIncome = sum(incomes(filtered));
  const totalExpenses = sum(expenses(filtered));
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const status = balance >= 0 ? "positive" : "negative";
  const emoji = balance >= 0 ? "great" : "overspent";

  return {
    answer: `Your ${ctx.label} balance is ${fmt(balance)} — ${status}. You earned ${fmt(totalIncome)} and spent ${fmt(totalExpenses)}. Your savings rate is ${savingsRate.toFixed(1)}%. ${savingsRate >= 20 ? "Excellent savings discipline!" : savingsRate >= 10 ? "Decent savings, but room to improve." : balance < 0 ? "You spent more than you earned this month." : "Consider increasing your savings rate to 20%+."}`,
    insights: [
      { icon: "dollar-sign", label: "Net Balance", value: fmt(balance), trend: balance >= 0 ? "up" : "down" },
      { icon: "arrow-down-left", label: "Income", value: fmt(totalIncome), trend: "up" },
      { icon: "arrow-up-right", label: "Expenses", value: fmt(totalExpenses), trend: "down" },
      { icon: "percent", label: "Savings Rate", value: `${savingsRate.toFixed(1)}%`, trend: savingsRate >= 20 ? "up" : "down" },
    ],
  };
}

function handleBiggestExpense(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const exp = expenses(filtered);

  if (exp.length === 0) {
    return { answer: `No expense transactions found for ${ctx.label}.` };
  }

  const sorted = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const top = sorted[0];

  const answer = `Your biggest expense in ${ctx.label} was "${top.description}" (${top.category}) at ${fmt(top.amount)}. Here are your top 5 expenses:`;

  return {
    answer,
    insights: sorted.map((tx, i) => ({
      icon: i === 0 ? "alert-circle" : "minus-circle",
      label: `${i + 1}. ${tx.description}`,
      value: fmt(tx.amount),
      trend: "down" as const,
    })),
  };
}

function handleSavingsRate(txs: Transaction[], ctx: DateContext): AIResponse {
  // Last 3 months analysis
  const results: { label: string; income: number; expenses: number; rate: number }[] = [];

  for (let i = 0; i < 3; i++) {
    let m = ctx.month - i;
    let y = ctx.year;
    if (m <= 0) { m += 12; y -= 1; }
    const filtered = filterByMonth(txs, m, y);
    const income = sum(incomes(filtered));
    const exp = sum(expenses(filtered));
    const rate = income > 0 ? ((income - exp) / income) * 100 : 0;
    results.push({ label: MONTH_SHORT[m - 1], income, expenses: exp, rate });
  }

  const current = results[0];
  const avgRate = results.reduce((s, r) => s + r.rate, 0) / results.length;

  let advice = "";
  if (current.rate >= 30) advice = "Outstanding! You're saving over 30% of your income.";
  else if (current.rate >= 20) advice = "Great work! You're meeting the 20% savings benchmark.";
  else if (current.rate >= 10) advice = "You're saving, but targeting 20% would build wealth faster.";
  else if (current.rate >= 0) advice = "Your savings rate is low. Try reducing top spending categories.";
  else advice = "You're spending more than you earn. Review your expense categories urgently.";

  return {
    answer: `Your savings rate in ${ctx.label} is ${current.rate.toFixed(1)}% (saving ${fmt(current.income - current.expenses)} out of ${fmt(current.income)} earned). 3-month average: ${avgRate.toFixed(1)}%. ${advice}`,
    insights: results.map((r) => ({
      icon: "percent",
      label: r.label,
      value: `${r.rate.toFixed(1)}%`,
      trend: (r.rate >= 20 ? "up" : r.rate >= 0 ? "neutral" : "down") as "up" | "down" | "neutral",
    })),
  };
}

function handleBreakdown(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const exp = expenses(filtered);
  const totalExp = sum(exp);
  const cats = groupByCategory(exp);

  if (cats.length === 0) {
    return { answer: `No expense data found for ${ctx.label}.` };
  }

  const topLines = cats
    .slice(0, 5)
    .map((c) => `${c.category}: ${fmt(c.total)} (${((c.total / totalExp) * 100).toFixed(1)}%)`)
    .join(", ");

  return {
    answer: `In ${ctx.label}, your ${fmt(totalExp)} in expenses breaks down as: ${topLines}. ${cats[0].category} is your biggest spending category.`,
    insights: cats.slice(0, 5).map((c) => ({
      icon: "pie-chart",
      label: c.category,
      value: `${fmt(c.total)} · ${((c.total / totalExp) * 100).toFixed(1)}%`,
      trend: "neutral" as const,
    })),
    chartData: cats.map((c) => ({
      label: c.category,
      value: c.total,
      color: categoryColor(c.category),
    })),
  };
}

function handleCompareMonths(txs: Transaction[], now: Date): AIResponse {
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();
  const prevM = curM === 1 ? 12 : curM - 1;
  const prevY = curM === 1 ? curY - 1 : curY;

  const cur = filterByMonth(txs, curM, curY);
  const prev = filterByMonth(txs, prevM, prevY);

  const curIncome = sum(incomes(cur));
  const curExpenses = sum(expenses(cur));
  const prevIncome = sum(incomes(prev));
  const prevExpenses = sum(expenses(prev));

  const incomeChange = prevIncome > 0 ? ((curIncome - prevIncome) / prevIncome) * 100 : 0;
  const expenseChange = prevExpenses > 0 ? ((curExpenses - prevExpenses) / prevExpenses) * 100 : 0;

  return {
    answer: `Comparing ${MONTH_NAMES[curM - 1]} vs ${MONTH_NAMES[prevM - 1]}: Income ${incomeChange >= 0 ? "up" : "down"} ${Math.abs(incomeChange).toFixed(1)}% (${fmt(curIncome)} vs ${fmt(prevIncome)}). Expenses ${expenseChange >= 0 ? "up" : "down"} ${Math.abs(expenseChange).toFixed(1)}% (${fmt(curExpenses)} vs ${fmt(prevExpenses)}). ${expenseChange < 0 ? "Great job reducing expenses!" : incomeChange > expenseChange ? "Income is growing faster than expenses — healthy trend." : "Watch your expenses — they're growing faster than income."}`,
    insights: [
      { icon: "trending-up", label: "Income Change", value: pct(incomeChange), trend: incomeChange >= 0 ? "up" : "down" },
      { icon: "trending-down", label: "Expense Change", value: pct(expenseChange), trend: expenseChange <= 0 ? "up" : "down" },
      { icon: "dollar-sign", label: `${MONTH_SHORT[curM - 1]} Balance`, value: fmt(curIncome - curExpenses), trend: (curIncome - curExpenses) >= 0 ? "up" : "down" },
      { icon: "dollar-sign", label: `${MONTH_SHORT[prevM - 1]} Balance`, value: fmt(prevIncome - prevExpenses), trend: (prevIncome - prevExpenses) >= 0 ? "up" : "down" },
    ],
  };
}

function handleMonthlyTrend(txs: Transaction[], now: Date): AIResponse {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    let m = now.getMonth() + 1 - i;
    let y = now.getFullYear();
    while (m <= 0) { m += 12; y -= 1; }
    const filtered = filterByMonth(txs, m, y);
    results.push({
      label: MONTH_SHORT[m - 1],
      income: sum(incomes(filtered)),
      expenses: sum(expenses(filtered)),
    });
  }

  const avgIncome = results.reduce((s, r) => s + r.income, 0) / results.length;
  const avgExpenses = results.reduce((s, r) => s + r.expenses, 0) / results.length;

  return {
    answer: `Over the last 6 months, your average monthly income was ${fmt(avgIncome)} and average expenses were ${fmt(avgExpenses)}, giving an average monthly savings of ${fmt(avgIncome - avgExpenses)}.`,
    insights: results.map((r) => ({
      icon: "bar-chart-2",
      label: r.label,
      value: fmt(r.income - r.expenses),
      trend: (r.income - r.expenses >= 0 ? "up" : "down") as "up" | "down",
    })),
  };
}

function handleAdvice(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const totalIncome = sum(incomes(filtered));
  const totalExpenses = sum(expenses(filtered));
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  const cats = groupByCategory(expenses(filtered));
  const topCat = cats[0];

  const tips: string[] = [];

  if (savingsRate < 10) tips.push(`Your savings rate is only ${savingsRate.toFixed(1)}%. Aim for 20%+ by reducing ${topCat?.category ?? "discretionary"} spending.`);
  if (topCat && totalExpenses > 0 && (topCat.total / totalExpenses) > 0.4)
    tips.push(`${topCat.category} takes ${((topCat.total / totalExpenses) * 100).toFixed(0)}% of your expenses — consider setting a budget cap.`);
  if (balance < 0) tips.push("You spent more than you earned this month. Identify non-essential expenses to cut.");
  if (savingsRate >= 20) tips.push("Excellent savings rate! Consider investing surplus in index funds or an emergency fund.");
  if (cats.length > 5) tips.push(`You spread spending across ${cats.length} categories. Focus on essentials to simplify and reduce total spend.`);

  if (tips.length === 0) tips.push("Your finances look balanced. Keep tracking consistently for better insights.");

  return {
    answer: `Finance tips for ${ctx.label}:\n\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}`,
    insights: [
      { icon: "dollar-sign", label: "Savings Rate", value: `${savingsRate.toFixed(1)}%`, trend: savingsRate >= 20 ? "up" : "down" },
      { icon: "trending-up", label: "Income", value: fmt(totalIncome), trend: "up" },
      { icon: "trending-down", label: "Expenses", value: fmt(totalExpenses), trend: "down" },
    ],
  };
}

function handleTopTransactions(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  if (sorted.length === 0) {
    return { answer: `No transactions found for ${ctx.label}.` };
  }

  const lines = sorted
    .map((tx) => `${tx.description} (${tx.category}): ${fmt(tx.amount)}`)
    .join(", ");

  return {
    answer: `Your most recent transactions in ${ctx.label}: ${lines}.`,
    insights: sorted.map((tx) => ({
      icon: tx.type === "income" ? "arrow-down-left" : "arrow-up-right",
      label: tx.description,
      value: fmt(tx.amount),
      trend: (tx.type === "income" ? "up" : "down") as "up" | "down",
    })),
  };
}

function handleGeneral(txs: Transaction[], ctx: DateContext): AIResponse {
  const filtered = filterByMonth(txs, ctx.month, ctx.year);
  const totalIncome = sum(incomes(filtered));
  const totalExpenses = sum(expenses(filtered));
  const balance = totalIncome - totalExpenses;

  return {
    answer: `For ${ctx.label}: Income ${fmt(totalIncome)}, Expenses ${fmt(totalExpenses)}, Net Balance ${fmt(balance)}. You have ${filtered.length} transactions on record. Ask me about specific categories, trends, or for financial advice!`,
    insights: [
      { icon: "dollar-sign", label: "Net Balance", value: fmt(balance), trend: balance >= 0 ? "up" : "down" },
      { icon: "trending-up", label: "Income", value: fmt(totalIncome), trend: "up" },
      { icon: "trending-down", label: "Expenses", value: fmt(totalExpenses), trend: "down" },
    ],
  };
}

// ─── Main query function ──────────────────────────────────────────────────────

export function queryFinances(
  question: string,
  transactions: Transaction[]
): AIResponse {
  if (!transactions || transactions.length === 0) {
    return {
      answer: "No transaction data found. Add some transactions first to get started with financial analysis.",
    };
  }

  const now = new Date();
  const ctx = extractDateContext(question, now);
  const intent = detectIntent(question);

  try {
    switch (intent) {
      case "spending_category":
        return handleSpendingCategory(transactions, question, ctx);
      case "expense_total":
        return handleExpenseTotal(transactions, ctx);
      case "income_total":
        return handleIncomeTotal(transactions, ctx);
      case "balance":
        return handleBalance(transactions, ctx);
      case "biggest_expense":
        return handleBiggestExpense(transactions, ctx);
      case "biggest_income": {
        const filtered = filterByMonth(transactions, ctx.month, ctx.year);
        const inc = incomes(filtered);
        if (inc.length === 0) return { answer: `No income found for ${ctx.label}.` };
        const top = inc.reduce((a, b) => (a.amount > b.amount ? a : b));
        return {
          answer: `Your biggest income source in ${ctx.label} was "${top.description}" (${top.category}) at ${fmt(top.amount)}.`,
          insights: [{ icon: "trending-up", label: top.description, value: fmt(top.amount), trend: "up" }],
        };
      }
      case "savings_rate":
        return handleSavingsRate(transactions, ctx);
      case "breakdown":
        return handleBreakdown(transactions, ctx);
      case "compare_months":
        return handleCompareMonths(transactions, now);
      case "monthly_trend":
        return handleMonthlyTrend(transactions, now);
      case "advice":
        return handleAdvice(transactions, ctx);
      case "top_transactions":
        return handleTopTransactions(transactions, ctx);
      default:
        return handleGeneral(transactions, ctx);
    }
  } catch {
    return handleGeneral(transactions, ctx);
  }
}
