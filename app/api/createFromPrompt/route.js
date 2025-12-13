// app/api/createFromPrompt/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // keep your key in .env.local
});

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ message: "Missing prompt" }, { status: 400 });
    }

    const instruction = `
You are generating a wheel JSON. Output ONLY valid JSON. No prose.

Requirements:
- Use a single top-level key formed from the prompt in snake_case, ending with "_picker_wheel".
- Include: title, description, tags (2-3), content (2 paragraphs), number of segments (max 40 entries based on query).
- Segments must be short strings, relevant to the prompt, no duplicates (in case where there are two choices like Right or Wrong, Left or Right segments should be only even users can make choice between the two).
- Keep descriptions friendly and concise.

Example format:
{
  "european_roulette_picker_wheel": {
    "title": "European Roulette Picker Wheel",
    "description": "Spin the wheel to simulate the European Roulette game...",
    "tags": ["Games", "Numbers"],
    "content": [
      { "type": "paragraph", "text": "Paragraph one..." },
      { "type": "paragraph", "text": "Paragraph two..." }
    ],
    "segments": ["7", "One", "22", "Twelve", "..."]
  }
}

Now generate for: "${prompt}"
Output JSON only.
`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: instruction }],
      max_tokens: 800,
    });

    const aiText = response.choices[0].message.content.trim();

    let json;
    try {
      json = JSON.parse(aiText);
    } catch (err) {
      return NextResponse.json(
        { message: "AI returned invalid JSON", raw: aiText },
        { status: 422 }
      );
    }

    const topKeys = Object.keys(json || {});
    if (topKeys.length !== 1) {
      return NextResponse.json(
        { message: "JSON must contain exactly one top-level key" },
        { status: 422 }
      );
    }

    const data = json[topKeys[0]];
    if (
      !data ||
      !data.title ||
      !data.description ||
      !Array.isArray(data.tags) ||
      !Array.isArray(data.content) ||
      !Array.isArray(data.segments)
    ) {
      return NextResponse.json(
        { message: "Missing required fields in JSON" },
        { status: 422 }
      );
    }

    return NextResponse.json({ json }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
