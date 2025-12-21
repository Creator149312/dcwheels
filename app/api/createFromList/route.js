// app/api/createFromTitleItems/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { title, items } = await req.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid title" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Items must be a non-empty array" },
        { status: 400 }
      );
    }

    const instruction = `
You are generating a structured JSON page. Output ONLY valid JSON. No prose.

Input:
- Title: "${title}"
- segments: ${JSON.stringify(items)}

Requirements:
- Use a single top-level key formed from the title in snake_case, ending with "_page".
- Include the following fields:
  - title: same as input title
  - description: 2–3 friendly sentences describing what this page is about
  - tags: 2–4 short tags relevant to the topic
  - content: an array of objects, each with:
      { "type": "paragraph", "text": "..." }
    Generate 2–3 paragraphs explaining or describing the topic.
  - segments: an array of the provided items (cleaned, deduplicated)
- Do NOT invent new items. Only use the provided list.
- Output JSON only.

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

Now generate for the given title and items.
Output JSON only.
`;

    // ✅ Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: instruction }],
      max_tokens: 900,
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

    // ✅ Validate top-level key
    const topKeys = Object.keys(json || {});
    if (topKeys.length !== 1) {
      return NextResponse.json(
        { message: "JSON must contain exactly one top-level key" },
        { status: 422 }
      );
    }

    const data = json[topKeys[0]];

    // ✅ Validate required fields (UPDATED)
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
