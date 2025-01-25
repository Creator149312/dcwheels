import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

export async function POST(req) {
  const { prompt } = await req.json();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Generate JSON for ${prompt} exactly similar to the following json, without any description: yes_or_no_wheel: { 
    title: "Yes or No Decision Picker Wheel",
    category: "Games",
    segments: ["Yes", "No", "Yes", "No", "Yes"],
  }".`,
        },
      ],
      max_tokens: 500,
    });

    const words = response.choices[0].message.content;

    console.log("Returned Words = ", words);

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // console.error("OpenAI API error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate words" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
