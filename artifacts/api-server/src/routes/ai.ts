import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AiFinanceQueryBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/ai/query", async (req, res) => {
  try {
    const body = AiFinanceQueryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { question } = body.data;

    // Fetch recent transactions for context
    const transactions = await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.date))
      .limit(200);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const transactionData = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      category: t.category,
      date: t.date.toISOString().split("T")[0],
    }));

    const systemPrompt = `You are a personal finance assistant. Today is ${now.toISOString().split("T")[0]} (Month: ${month}, Year: ${year}).

You have access to the user's transaction data (up to 200 most recent transactions). Answer questions concisely and helpfully, including specific numbers when relevant.

Transaction data:
${JSON.stringify(transactionData, null, 2)}

Guidelines:
- Be concise but specific with amounts (use $ prefix)
- If asked about "this month", filter to month ${month}, year ${year}
- Format currency nicely (e.g., $1,234.56)
- Give actionable insights when appropriate
- Keep responses under 200 words`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "I couldn't process your question. Please try again.";

    res.json({ answer, data: null });
  } catch (err) {
    req.log.error({ err }, "Error processing AI query");
    res.status(500).json({ error: "Failed to process query" });
  }
});

export default router;
