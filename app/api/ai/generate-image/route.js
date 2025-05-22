import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

export async function POST(req) {
  const { prompt } = await req.json();

  try {
    // Here we use OpenAI's API to generate an image, for instance with DALL·E model (assuming GPT-4o-mini isn't directly used for images).
    const response = await openai.images.create({
      model: "dall-e-3",
      prompt: `generate theme image for ${prompt}`, // The image prompt
      n: 1, // Generate a single image
      size: "1024x768", // You can adjust the size (1024x1024 is a common default)
    });

    // Get the URL of the generated image
    const imageUrl = response.data[0].url;

    return new Response(
      JSON.stringify({ imageUrl }), // Return the image URL
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
