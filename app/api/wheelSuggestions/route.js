// app/api/wheelSuggestions/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ message: "Missing prompt" }, { status: 400 });
    }

    const instruction = `
You are an assistant that suggests creative wheel ideas.
Given a theme or prompt, return ONLY a JSON array of 5-7 short suggestion strings.
Each suggestion should be a type of wheel the user could create.

Example:
["Trivia Challenge Wheel", "Fitness Workout Wheel", "Movie Night Picker", "Icebreaker Questions Wheel"]

Now generate suggestions for: "${prompt}"
Output JSON array only.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: instruction }],
      max_tokens: 300,
    });

    const aiText = response.choices[0].message.content.trim();

    let suggestions;
    try {
      suggestions = JSON.parse(aiText);
    } catch {
      return NextResponse.json(
        { message: "AI returned invalid JSON", raw: aiText },
        { status: 422 }
      );
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json(
        { message: "Suggestions must be an array", raw: aiText },
        { status: 422 }
      );
    }

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
