import { callOpenAI } from "@components/actions/actions";
import { sessionUserId } from "@utils/SessionData";
import { aiGate } from "@lib/aiGate";

// Fallback palette used when the model's output can't be parsed into
// 4 valid hex codes. Keeps the wheel visually consistent instead of
// breaking the whole Smart Wheel flow over a decorative miss.
const DEFAULT_PALETTE = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];

// Match #RGB or #RRGGBB — anywhere in the string. Previously the route
// did `split(",").slice(0, 4)`, which returned garbage like "Sure! #FF0000"
// when the model added a preamble.
function extractHexColors(text) {
  if (typeof text !== "string") return [];
  const matches = text.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || [];
  // Expand 3-char hex to 6-char so consumers can rely on a single shape.
  return matches.map((c) => {
    if (c.length === 4) {
      const [, r, g, b] = c;
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return c.toUpperCase();
  });
}

export async function POST(req) {
  const blocked = await aiGate(req);
  if (blocked) return blocked;

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ colorCodes: DEFAULT_PALETTE }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return new Response(
      JSON.stringify({ colorCodes: DEFAULT_PALETTE }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const finalPrompt = `Suggest exactly 4 visually distinct hex color codes that fit the theme "${prompt}". Respond with only the four codes separated by commas, no commentary. Example: #FF6B6B, #4ECDC4, #FFE66D, #1A535C`;
    const userId = await sessionUserId();
    const options = { max_tokens: 100, temperature: 0.6 };
    const response = await callOpenAI(userId, finalPrompt, options, prompt);

    const raw = response.choices?.[0]?.message?.content || "";
    const colors = extractHexColors(raw).slice(0, 4);

    // Pad with defaults if the model returned fewer than 4 valid codes.
    while (colors.length < 4) {
      colors.push(DEFAULT_PALETTE[colors.length]);
    }

    return new Response(JSON.stringify({ colorCodes: colors }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Theme is purely decorative — never fail the upstream Smart Wheel flow
    // over a colour-pick miss. Return the default palette and 200 so the
    // client can carry on.
    console.warn("generate-theme: falling back to default palette", error?.message);
    return new Response(JSON.stringify({ colorCodes: DEFAULT_PALETTE }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
