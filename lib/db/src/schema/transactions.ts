import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

export const categoryEnum = pgEnum("category", [
  "Food",
  "Shopping",
  "Transportation",
  "Housing",
  "Healthcare",
  "Entertainment",
  "Travel",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  note: text("note"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true }).extend({
  amount: z.number().positive(),
  date: z.string().datetime().or(z.date()).transform((v) => new Date(v)),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
