import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates interactive comments for a seeded post.
 * Returns an array of comment objects with text and persona index.
 */
export async function generateAIComments(persona, postContent, animeTitle, count = 1) {
    const prompt = `
        You are an anime fan with this personality: ${persona.bio}.
        You are reading a social post about "${animeTitle}".
        
        Post Content: "${postContent}"

        Write ${count} natural-sounding comment(s) responding to this.
        
        GOAL: Make the thread feel alive and diverse. Every comment should feel like a real person with a strong opinion, a sense of humor, or a bone to pick.
        
        DIVERSITY MIX (Pick one vibe per comment):
        - HUMOR/FUNNY: Make a joke about the characters, the studio, or the fandom's obsession.
        - CONTROVERSIAL/HOT TAKE: Disagree with the post or drop a "gatekeeper" opinion that starts an argument.
        - JOKE/MEME: Reference a well-known community meme or a funny logical flaw in the series.
        - EMOTIONAL/SINCERE: Be a total "stan" or express how a scene actually hurt your soul.
        
        RULES:
        1. Stand up for your beliefs or disagree/agree strongly.
        2. Keep it under 150 characters.
        3. No links. No generic "Great post!" or "I agree."
        4. Use internet slang (L, W, mid, peak, literally me, etc.) based on your persona.
        5. Return ONLY a JSON array of strings: ["comment 1", "comment 2"]
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
            presence_penalty: 0.5,
        });

        const content = response.choices[0].message.content.trim();
        const jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Comment AI Error:", error);
        return [];
    }
}
