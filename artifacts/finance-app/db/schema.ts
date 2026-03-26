import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// ─── Core Financial Data ─────────────────────────────────────────────────────

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  date: text("date").notNull(), // ISO 8601
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Budget Targets ──────────────────────────────────────────────────────────

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  monthlyLimit: real("monthly_limit").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── AI Conversation Sessions ────────────────────────────────────────────────

export const aiConversations = sqliteTable("ai_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

// ─── AI Messages ─────────────────────────────────────────────────────────────

export const aiMessages = sqliteTable("ai_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON: insights, chart data, etc.
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = typeof aiMessages.$inferInsert;

// ─── AI Insights Cache ───────────────────────────────────────────────────────

export const aiInsights = sqliteTable("ai_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'spending_pattern', 'anomaly', 'recurring', 'forecast'
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  data: text("data"), // JSON payload
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  isRead: integer("is_read").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = typeof aiInsights.$inferInsert;
