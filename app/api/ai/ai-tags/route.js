// app/api/ai-tags/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { aiGate } from "@lib/aiGate";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const blocked = await aiGate(req);
  if (blocked) return blocked;

  const { prompt } = await req.json();
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Return 1 relevant anime name in camel case as a string for the wheel titled: "${prompt}".`,
        },
      ],
      max_tokens: 100,
    });

    const tagsText = response.choices[0].message.content.trim();
    // Parse array from AI response
    let tags;
    try {
      tags = JSON.parse(tagsText);
    } catch (e) {
      return NextResponse.json({ error: "Invalid response format from AI." }, { status: 400 });
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to generate tags" }, { status: 500 });
  }
}
