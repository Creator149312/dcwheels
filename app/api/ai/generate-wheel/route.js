import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateValidJsonResponse(contentFormats) {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a JSON generator. Always respond ONLY with a valid JSON object in the form: { \"words\": [\"word1\", \"word2\", ...] }. No explanations, no extra text.",
          },
          { role: "user", content: contentFormats },
        ],
        max_tokens: 200,
      });

      let rawContent = response.choices[0].message.content.trim();
      console.log("Raw OpenAI response:", rawContent);

      // Try parsing as-is
      try {
        const parsed = JSON.parse(rawContent);

        // ✅ If already in { words: [...] } format
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.words) &&
          parsed.words.every((item) => typeof item === "string")
        ) {
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 🔄 Fallback: if it's just an array, wrap it
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          return new Response(JSON.stringify({ words: parsed }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (parseError) {
        // Fallback: extract array from text and wrap
        const match = rawContent.match(/\[.*\]/s);
        if (match) {
          const arr = JSON.parse(match[0]);
          if (Array.isArray(arr) && arr.every((item) => typeof item === "string")) {
            return new Response(JSON.stringify({ words: arr }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      }

      console.warn("Invalid format. Retrying...");
    } catch (error) {
      console.warn("API call failed. Retrying...", error);
    }

    attempts++;
  }

  return new Response(
    JSON.stringify({ error: "Failed to generate valid words after multiple attempts." }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req) {
  const { prompt, wordCount } = await req.json();
  const contentFormats = `Generate exactly ${wordCount} words for "${prompt}" as a JSON object in the form: { "words": ["word1", "word2", ...] }.`;

  return await generateValidJsonResponse(contentFormats);
}
