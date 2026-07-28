import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIPost(persona, animeTitle, type = "casual") {
  const isPoll = type === "poll";

  // TEXT POST TEMPLATES - High emotion, deep opinion, human beliefs and hot takes
  const textTemplates = [
    `Honestly, I need to know: if you could save just ONE character from "${animeTitle}" who met a tragic end, but in turn, your absolute favorite living character in the series has to take their place... are you making that trade? Choose carefully.`,
    `Let's do a power system reality check on "${animeTitle}". What's the most underrated technique or ability that gets completely overshadowed because the main protagonist has literal cheat codes? It honestly bugs me how people sleep on it.`,
    `Unpopular opinion but I need to say it: is there a narrative direction or a major character decision in "${animeTitle}" that you actually loved, but the entire fandom seems to collectively hate and flame? Let's talk about it.`,
    `Secondary characters in "${animeTitle}" have backstories that are infinitely more tragic and better written than the actual main protagonist. Change my mind.`,
    `Can we talk about the soundtrack in "${animeTitle}"? There is this one specific battle track/motif that literally gives me goosebumps every single time. It elevates the entire scene from decent to absolute peak cinema.`,
    `Would you rather have the ability to unleash a single powerful attack/ability from "${animeTitle}" but it completely drains your energy for a week, OR master a basic but flawless ability that you can use indefinitely without ever getting tired? If you pick the first option, you are dropped directly into its most famous battleground. If you pick the second, you have to survive a week in its most dangerous setting.`,
    `Would you rather live a cozy, slow-paced slice-of-life journey alongside a character from "${animeTitle}", but you have to walk everywhere and live off wild mushrooms, OR live a high-stakes, glamorous, but chaotic lifestyle managed by one of its intense characters where you constantly have to dodge intrigue or scandals? Twist: Whichever path you choose, the entire universe is animated by a studio known for a radically different style!`
  ];

  // POLL POST TEMPLATES - Highly debatable topics, strong preference splits
  const pollTemplates = [
    "Sub vs. Dub: The ultimate debate that will never die. How are you watching your favorite seasonal series like \"${animeTitle}\"? Let be honest, the dub actually ruins the emotional peak scenes, or is it better?",
    "The Peak Hype Arc: Has \"${animeTitle}\" brought insane visual set pieces lately? Is it currently holding the crown for the best modern animation in its league, or is it heavily carried by production budget and lacks genuine soul?",
    "Binge vs. Weekly: When a highly anticipated series like \"${animeTitle}\" drops, what is your preferred way to experience the story? Does weekly waiting kill the hype or build unmatched community suspense?",
    "Introduction Masterpiece: You can judge an anime heavily by its intro track. Which Opening Theme (OP) of \"${animeTitle}\" is the absolute unskippable masterpiece that has the best visual direction?",
    "The Live-Action Curse: With successful adaptations proving it can be done right, do you think Hollywood should keep attempting live-action adaptations of stellar series like \"${animeTitle}\", or will they always ruin the artistic integrity?",
    "The Tear-Jerker Test: We've all been completely broken by an emotional episode. Has \"${animeTitle}\" pulled at your heartstrings the hardest, or are people just overhyping simple emotional bait?",
    "Unpopular Design Choice: Character redesigns can make or break a sequel. How do you feel about the visual evolution and art style choices in \"${animeTitle}\"? Did the studio swap downgrade the vibe?",
    "The Filler Verdict: Are the filler or anime-only episodes in \"${animeTitle}\" actually enjoyable slice-of-life additions, or do you skip them instantly because they drag down the pacing?",
    "The Power System Check: Does the power scaling or world-building system in \"${animeTitle}\" make logical sense, or is it starting to suffer from massive power creep where side characters become utterly useless?"
  ];

  const selectedTemplate = isPoll 
    ? pollTemplates[Math.floor(Math.random() * pollTemplates.length)].replace(/\${animeTitle}/g, animeTitle)
    : textTemplates[Math.floor(Math.random() * textTemplates.length)].replace(/\${animeTitle}/g, animeTitle);

  const prompt = isPoll 
    ? `You are a real fan with this personality: ${persona.bio}.
       Theme/Base Option: ${selectedTemplate}
       Write a POLL for "${animeTitle}".
       
       RETURN ONLY A JSON OBJECT:
       {
         "content": "Rewrite the Theme/Base Option to fit the anime '${animeTitle}' beautifully, adopting your unique fan voice. Do NOT include any links.",
         "pollOptions": ["Specific Option 1", "Specific Option 2", "Specific Option 3"]
       }
       
       CONSTRAINT: pollOptions MUST be under 60 characters each. They MUST be specific to ${animeTitle} (characters, arcs, choices, or abilities). 
       NEVER use generic 'Yes/No' unless the theme explicitly asks for a verdict.`
    : `You are a real fan with this personality: ${persona.bio}.
       Theme/Base Option: ${selectedTemplate}
       Write a short, punchy social post about "${animeTitle}".
       Include #${animeTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.
       
       RULES:
       1. Max 180 chars. 
       2. Do NOT mention your own name.
       3. Do NOT include ANY links or URLs.
       4. Adapt the Theme/Base Option to fit the anime '${animeTitle}' beautifully, adopting your unique fan voice.
       5. Sound human, use internet slang, be opinionated.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.95,
      presence_penalty: 0.6,
    });

    let content = response.choices[0].message.content.trim();
    
    if (isPoll) {
        try {
            const jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(jsonStr);
            // Safety check for generic options
            const generic = ["yes", "no", "maybe", "agree", "disagree"];
            if (parsed.pollOptions.some(opt => generic.includes(opt.toLowerCase()))) {
                parsed.pollOptions = ["Power Level", "Story Arc", "Character Design", "Theme Song"];
            }
            return parsed;
        } catch (e) {
            return { content: `Favorite part of ${animeTitle}?`, pollOptions: ["Animation", "Characters", "Plot"] };
        }
    }

    return content;
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
}
