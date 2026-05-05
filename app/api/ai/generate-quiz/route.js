import { NextResponse } from "next/server";
import OpenAI from "openai";
import { aiGate } from "@lib/aiGate";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MONTHLY_LIMIT = 20;

export async function POST(req) {
  // 1. Auth gate + per-IP rate limit (must come before req.json())
  const gate = await aiGate(req);
  if (gate) return gate;

  // 2. Per-user monthly quota check
  const session = await getServerSession(authOptions);
  await connectMongoDB();
  const now = new Date();

  const user = await User.findOne(
    { email: session.user.email },
    { aiQuizGenerations: 1 }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 403 });
  }

  const gen = user.aiQuizGenerations || { count: 0, resetAt: null };
  const windowExpired = !gen.resetAt || gen.resetAt < now;

  if (windowExpired) {
    // New window — reset counter and count this request as the first use
    await User.updateOne(
      { email: session.user.email },
      {
        $set: {
          "aiQuizGenerations.count": 1,
          "aiQuizGenerations.resetAt": new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }
    );
  } else if (gen.count >= MONTHLY_LIMIT) {
    const daysLeft = Math.ceil((gen.resetAt - now) / (1000 * 60 * 60 * 24));
    return NextResponse.json(
      {
        error: `Monthly AI limit reached (${MONTHLY_LIMIT}/month). Resets in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      },
      { status: 429 }
    );
  } else {
    await User.updateOne(
      { email: session.user.email },
      { $inc: { "aiQuizGenerations.count": 1 } }
    );
  }

  try {
    const { context, numQuestions = 6, numOptions = 4 } = await req.json();

    if (!context?.trim()) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }

    const n = Math.max(1, Math.min(20, parseInt(numQuestions, 10) || 6));
    const o = Math.max(2, Math.min(4, parseInt(numOptions, 10) || 4));

    const optionKeys = ["A", "B", "C", "D"].slice(0, o);

    const prompt = `You are a quiz generator. Generate exactly ${n} multiple-choice questions based on the following topic or context:

"${context.trim()}"

Rules:
- Each question must have exactly ${o} answer options (${optionKeys.join(", ")}).
- Exactly one option must be correct.
- The "text" field is a short label (2–4 words) that will appear on the wheel slice.
- The "question" field is the full question text shown to the player.
- "options" is an array of ${o} strings (the answer choices).
- "correctIndex" is the 0-based index of the correct answer in the options array.
- Make questions varied in difficulty (easy, medium, hard).
- Do NOT repeat similar questions.
- Output ONLY a valid JSON array. No prose, no markdown fences.

Output format:
[
  {
    "text": "Short Label",
    "question": "Full question text?",
    "options": ["Option A", "Option B"${o > 2 ? ', "Option C"' : ""}${o > 3 ? ', "Option D"' : ""}],
    "correctIndex": 0
  }
]

Generate ${n} questions now. Output JSON only.`;

    let attempts = 0;
    let segments = null;

    while (attempts < 3 && !segments) {
      attempts++;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300 * n,
        temperature: 0.7,
      });

      const raw = (response.choices[0].message?.content ?? "").trim();

      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error("Not an array");

        segments = parsed
          .slice(0, n)
          .map((q) => ({
            text: String(q.text || "Question").slice(0, 40),
            question: String(q.question || "").trim(),
            options: (Array.isArray(q.options) ? q.options : []).slice(0, o).map(String),
            correctIndex: Math.max(0, Math.min(o - 1, parseInt(q.correctIndex, 10) || 0)),
            weight: 1,
            visible: true,
          }))
          .filter((q) => q.question && q.options.length >= 2);
      } catch {
        // retry
      }
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "AI failed to generate valid questions. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ segments });
  } catch (err) {
    console.error("generate-quiz error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
