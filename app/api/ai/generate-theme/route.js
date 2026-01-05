import { callOpenAI } from "@components/actions/actions";
import { sessionUserId } from "@utils/SessionData";

export async function POST(req) {
  const { prompt } = await req.json();
  // console.log("Prompt - ", prompt);
  try {
    const finalPrompt = `only give 4 color codes for "${prompt}" each separated by comma`;
    const userId = await sessionUserId();
    // console.log("User Id = " + userId);
    const options = { max_tokens: 200 };
    const response = await callOpenAI(userId, finalPrompt, options, prompt);
    //  console.log("OpenAI response:", response);
    const colorCodes = response.choices[0].message.content
      .split(",")
      .map((word) => word.trim())
      .slice(0, 4); // Ensure we only take 4 words

    return new Response(JSON.stringify({ colorCodes }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate colors" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
