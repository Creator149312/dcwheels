import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

export async function POST(req) {
  const { prompt, wordCount } = await req.json();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `Generate an array of ${wordCount} words without numbering related to: "${prompt}".` }],
      max_tokens: 50,
    });

    const words = response.choices[0].message.content
      .split(',')
      .map(word => word.trim())
      .slice(0, wordCount); // Ensure we only take 6 words

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate words' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
