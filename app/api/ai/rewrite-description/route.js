import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const { prompt } = await req.json();
  // console.log("Rewrite Prompt Received");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${prompt}`,
        },
      ],
      max_tokens: 300,
    });

    const rewrittenText = response.choices[0].message.content.trim();
    // console.log("Rewritten Text = ", rewrittenText);

    return NextResponse.json({ rewrittenText });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to rewrite description" }, { status: 500 });
  }
}
