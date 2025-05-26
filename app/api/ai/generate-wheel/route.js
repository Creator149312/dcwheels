import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

async function generateValidJsonResponse(contentFormats) {
  const maxRetries = 5;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: contentFormats }],
        max_tokens: 200,
      });

      const rawContent = response.choices[0].message.content;
      // console.log("Raw OpenAI response:", rawContent);

      // Try to parse JSON
      const parsed = JSON.parse(rawContent);

      // Validate it’s an array of strings
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        return new Response(JSON.stringify({ words: parsed }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // console.warn(
      //   "Content is not a valid. Retrying..."
      // );
    } catch (error) {
      // console.warn("API call failed. Retrying...", error);
    }

    attempts++;
  }

  // Failed after retries
  return new Response(
    JSON.stringify({
      error: "Failed to generate valid Wheel after multiple attempts.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function POST(req) {
  const { prompt, wordCount } = await req.json();
  const contentFormats = `Respond only with a JSON array of strings of ${wordCount} entries for "${prompt}". Do not include any explanation, formatting, or extra text.`;

  return await generateValidJsonResponse(contentFormats);

  // // `Generate comma separated ${wordCount} entries for "${prompt}"`

  // try {
  //   const response = await openai.chat.completions.create({
  //     model: "gpt-4o-mini",
  //     messages: [{ role: "user", content: contentFormats }],
  //     max_tokens: 200,
  //   });

  //   console.log(response.choices[0].message.content);
  //   const words = JSON.parse(response.choices[0].message.content);

  //   return new Response(JSON.stringify({ words }), {
  //     status: 200,
  //     headers: { "Content-Type": "application/json" },
  //   });
  // } catch (error) {
  //   console.error("OpenAI API error:", error);
  //   return new Response(JSON.stringify({ error: "Failed to generate words" }), {
  //     status: 500,
  //     headers: { "Content-Type": "application/json" },
  //   });
  // }
}
