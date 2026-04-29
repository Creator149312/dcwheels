import { callOpenAI } from "@components/actions/actions";
import { sessionUserId } from "@utils/SessionData";
import { aiGate } from "@lib/aiGate";

export async function POST(req) {
  const blocked = await aiGate(req);
  if (blocked) return blocked;

  const { prompt, wordCount } = await req.json();

  try {
    const finalPrompt = `Generate comma separated ${wordCount} words related to: "${prompt}"`;
    const userId = await sessionUserId();
    // console.log("User Id = " + userId);
    const options = { max_tokens: 500 };
    const response = await callOpenAI(userId, finalPrompt, options, prompt);

    const words = response.choices[0].message.content
      .split(",")
      .map((word) => word.trim())
      .slice(0, wordCount); // Ensure we only take 6 words

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate words" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
