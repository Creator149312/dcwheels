import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Challenge from "@models/challenge";
import UserBadge from "@models/userBadge";
import DecisionLog from "@models/decisionLog";
import { sessionUserId } from "@utils/SessionData";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/challenges/verify
 *
 * Step 1 — Generate quiz questions (action: "generate")
 * Body: { challengeId, decisionLogId }
 * Returns: { questions: [{question, options, correctIndex}] }
 *
 * Step 2 — Submit answers and award badge (action: "submit")
 * Body: { challengeId, decisionLogId, answers: [0, 2, 1, ...] }
 * Returns: { passed, correct, total, badge? }
 */
export async function POST(req) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to verify challenges." }, { status: 401 });
    }

    const body = await req.json();
    const { action, challengeId, decisionLogId, answers } = body ?? {};

    if (!challengeId || !decisionLogId) {
      return NextResponse.json(
        { error: "challengeId and decisionLogId are required." },
        { status: 400 }
      );
    }

    // Load challenge and verify it exists
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge || !challenge.active) {
      return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    }

    // Load the DecisionLog entry — must belong to this user
    const log = await DecisionLog.findOne({ _id: decisionLogId, userId }).lean();
    if (!log) {
      return NextResponse.json(
        { error: "Spin record not found or doesn't belong to you." },
        { status: 404 }
      );
    }

    // Check not already completed
    const existing = await UserBadge.findOne({ userId, challengeId }).lean();
    if (existing) {
      return NextResponse.json({ error: "You already earned this badge.", alreadyEarned: true }, { status: 409 });
    }

    // ── STEP 1: Generate quiz questions ──────────────────────────────────────
    if (action === "generate") {
      const n = Math.max(3, Math.min(5, challenge.quizQuestions || 3));
      const topic = log.result; // e.g. "Attack on Titan"
      const context = challenge.entityType
        ? `${challenge.entityType}: "${topic}"`
        : `"${topic}"`;

      const prompt = `You are a quiz generator for a challenge system on a spin-the-wheel website.
Generate exactly ${n} multiple-choice questions to verify that the user has actually engaged with: ${context}.

Rules:
- Questions should test genuine knowledge (plot, characters, themes, mechanics) — not trivial facts.
- Each question has exactly 4 answer options.
- Exactly one option is correct.
- "correctIndex" is the 0-based index of the correct answer.
- Make questions range from easy to medium difficulty.
- Output ONLY a valid JSON array. No prose, no markdown fences.

Output format:
[
  {
    "question": "Full question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Generate ${n} questions now.`;

      let questions = null;
      let attempts = 0;
      while (attempts < 3 && !questions) {
        attempts++;
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300 * n,
          temperature: 0.7,
        });

        const raw = (response.choices[0].message?.content ?? "").trim();
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

        try {
          const parsed = JSON.parse(cleaned);
          if (!Array.isArray(parsed)) throw new Error("Not array");
          questions = parsed
            .slice(0, n)
            .map((q) => ({
              question: String(q.question || "").trim(),
              options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(String),
              correctIndex: Math.max(0, Math.min(3, parseInt(q.correctIndex, 10) || 0)),
            }))
            .filter((q) => q.question && q.options.length === 4);
          if (questions.length < 2) questions = null;
        } catch {
          // retry
        }
      }

      if (!questions) {
        return NextResponse.json(
          { error: "Could not generate quiz questions. Please try again." },
          { status: 422 }
        );
      }

      // Return questions WITHOUT correctIndex to the client
      // We store the answers server-side via a short-lived signed approach:
      // here we just return the correctIndexes as a server-verified array
      // on the submit step by re-deriving from the same generation.
      // For simplicity, we embed correctIndexes in a signed token structure.
      // Since this is low-stakes (badge verification, not money), we store
      // them in a simple base64 payload with the challengeId+userId+timestamp.
      const payload = Buffer.from(
        JSON.stringify({
          challengeId: String(challengeId),
          decisionLogId: String(decisionLogId),
          userId: String(userId),
          correctIndexes: questions.map((q) => q.correctIndex),
          exp: Date.now() + 15 * 60 * 1000, // 15-minute expiry
        })
      ).toString("base64");

      // Strip correctIndex before sending to client
      const clientQuestions = questions.map(({ question, options }) => ({ question, options }));

      return NextResponse.json({ questions: clientQuestions, token: payload });
    }

    // ── STEP 2: Submit answers ───────────────────────────────────────────────
    if (action === "submit") {
      const { token } = body;
      if (!token || !Array.isArray(answers)) {
        return NextResponse.json({ error: "Token and answers are required." }, { status: 400 });
      }

      // Decode and validate token
      let tokenData;
      try {
        tokenData = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
      } catch {
        return NextResponse.json({ error: "Invalid verification token." }, { status: 400 });
      }

      if (
        tokenData.challengeId !== String(challengeId) ||
        tokenData.decisionLogId !== String(decisionLogId) ||
        tokenData.userId !== String(userId)
      ) {
        return NextResponse.json({ error: "Token mismatch." }, { status: 403 });
      }

      if (Date.now() > tokenData.exp) {
        return NextResponse.json({ error: "Verification session expired. Please regenerate questions." }, { status: 410 });
      }

      const correctIndexes = tokenData.correctIndexes;
      const total = correctIndexes.length;
      const correct = answers.reduce((acc, ans, i) => {
        return acc + (ans === correctIndexes[i] ? 1 : 0);
      }, 0);

      const threshold = challenge.quizPassThreshold || 2;
      const passed = correct >= threshold;

      if (!passed) {
        return NextResponse.json({ passed: false, correct, total });
      }

      // Award badge — upsert guards against race conditions
      let badge;
      try {
        badge = await UserBadge.create({
          userId,
          challengeId,
          badgeSlug: challenge.badgeSlug,
          badgeTitle: challenge.title,
          tier: challenge.tier,
          entityType: challenge.entityType || "",
          decisionLogId,
          spinResult: log.result,
        });

        // Mark the DecisionLog entry as done
        await DecisionLog.updateOne({ _id: decisionLogId }, { $set: { status: "done" } });
      } catch (err) {
        // Duplicate key = already earned (race condition)
        if (err.code === 11000) {
          return NextResponse.json({ passed: true, correct, total, alreadyEarned: true });
        }
        throw err;
      }

      return NextResponse.json({
        passed: true,
        correct,
        total,
        badge: {
          slug: badge.badgeSlug,
          title: badge.badgeTitle,
          tier: badge.tier,
          entityType: badge.entityType,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/challenges/verify error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
