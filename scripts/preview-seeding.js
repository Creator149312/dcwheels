import fs from "fs";
import path from "path";
import { generateAIPost } from "./ai-generation-helper.js";

/**
 * PREVIEW SCRIPT: See what the AI produces before seeding DB
 */
async function previewSeeds() {
  const personas = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/personas.json"), "utf8"));
  
  const testCases = [
    { title: "Hunter X Hunter", slug: "hunter-x-hunter" },
    { title: "Solo Leveling", slug: "solo-leveling" },
    { title: "Chainsaw Man", slug: "chainsaw-man" }
  ];

  console.log("--- 🕵️ AI POST GENERATION PREVIEW ---");

  for (const test of testCases) {
    console.log(`\nTARGET: ${test.title}`);
    
    // Pick 2 random personas for each
    const selectedPersonas = personas
        .filter(p => p.interests.includes("anime"))
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

    for (const persona of selectedPersonas) {
      const type = Math.random() > 0.6 ? "poll" : (Math.random() > 0.5 ? "controversial" : "casual");
      const result = await generateAIPost(persona, test.title, type);
      
      console.log(`\n[@${persona.username} - ${type.toUpperCase()}]:`);
      if (type === "poll") {
        console.log(`Message: "${result.content}"`);
        console.log(`Poll Options: [${result.pollOptions.join(", ")}]`);
      } else {
        console.log(`"${result}"`);
      }
    }
    console.log("------------------------------------");
  }
}

previewSeeds();
