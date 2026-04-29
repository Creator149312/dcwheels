import { OpenAI } from "openai";
import { aiGate } from "@lib/aiGate";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Strip leading numbering ("1.", "1)", "-", "*"), surrounding quotes, and
// any stray markdown emphasis the model sometimes wraps individual items in.
function sanitizeWord(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^[\s\-\*\u2022]+/, "")     // leading bullets / dashes
    .replace(/^\d+[\.\)\:]\s*/, "")       // "1.", "1)", "1:"
    .replace(/^["'`]+|["'`]+$/g, "")        // wrapping quotes
    .replace(/\*+/g, "")                     // markdown emphasis
    .trim();
}

function normalizeWords(arr, wordCount) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const cleaned = sanitizeWord(typeof item === "string" ? item : item?.text);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= wordCount) break;
  }
  return out;
}

// Best-effort parse: strict JSON first, then strip markdown fences,
// then extract the first JSON literal we can find.
function parseModelJson(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch {}
  }
  return null;
}

async function generateValidJsonResponse(userPrompt, wordCount) {
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        // response_format guarantees parseable JSON. Without this the model
        // sporadically wraps output in markdown fences or adds preamble,
        // which was the root cause of the "type prompt 2â€“3 times before
        // it works" UX bug.
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a JSON generator for a spin-wheel app. Always respond with a JSON object of the exact shape: {"words": ["item1", "item2", ...]}. Each item is a short, standalone label (1-4 words). No numbering, no leading bullets, no surrounding quotes inside the string values.',
          },
          { role: "user", content: userPrompt },
        ],
        // Bumped from 200: with 10+ items of longer phrases (movie titles,
        // food dishes) the old cap truncated the JSON mid-array and parsing
        // failed, forcing the user to retry.
        max_tokens: 600,
        temperature: 0.7,
      });

      const rawContent = response.choices?.[0]?.message?.content || "";
      const parsed = parseModelJson(rawContent);

      let candidateWords = null;
      if (parsed && Array.isArray(parsed.words)) {
        candidateWords = parsed.words;
      } else if (Array.isArray(parsed)) {
        candidateWords = parsed;
      } else if (parsed && typeof parsed === "object") {
        // Some models emit { items: [...] } / { result: [...] } variants.
        const firstArrayKey = Object.keys(parsed).find((k) =>
          Array.isArray(parsed[k])
        );
        if (firstArrayKey) candidateWords = parsed[firstArrayKey];
      }

      const words = normalizeWords(candidateWords, wordCount);
      if (words.length >= Math.min(3, wordCount)) {
        return new Response(JSON.stringify({ words }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      lastError = "Model returned unusable content";
      console.warn(
        "generate-wheel: invalid format on attempt",
        attempt + 1,
        rawContent?.slice(0, 200)
      );
    } catch (error) {
      lastError = error?.message || "OpenAI request failed";
      console.warn("generate-wheel: API call failed", lastError);
    }
  }

  return new Response(
    JSON.stringify({
      error: "Couldn't generate a wheel right now. Please try again.",
      detail: lastError || "unknown",
    }),
    { status: 502, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req) {
  const blocked = await aiGate(req);
  if (blocked) return blocked;

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const promptRaw = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const wordCount = Math.min(
    30,
    Math.max(3, parseInt(body?.wordCount, 10) || 10)
  );

  if (!promptRaw) {
    return new Response(JSON.stringify({ error: "Prompt is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userPrompt = `Generate exactly ${wordCount} short, distinct items for a spin wheel about: "${promptRaw}". Return JSON in the form {"words": ["item1", "item2", ...]}. Items must be plain text labels â€” no numbering, no bullets, no surrounding quotes inside the array values.`;

  return generateValidJsonResponse(userPrompt, wordCount);
}
