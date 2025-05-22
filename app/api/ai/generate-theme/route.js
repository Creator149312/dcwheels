import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

export async function POST(req) {
  const { prompt } = await req.json();
  console.log("Prompt - ", prompt);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `only give 4 color codes for "${prompt}" each separated by comma`,
        },
      ],
      max_tokens: 200,
    });

    const colorCodes = response.choices[0].message.content
      .split(",")
      .map((word) => word.trim())
      .slice(0, 4); // Ensure we only take 4 words

    console.log("Words = \n", colorCodes);
    return new Response(JSON.stringify({ colorCodes }), {
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
