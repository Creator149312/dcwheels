/**
 * Seed script: creates three high-value Quiz Wheel pages for SEO.
 *
 * Run with: node scripts/seed-quiz-wheels.mjs
 *
 * Safe to re-run — uses upsert so existing slugs are not duplicated.
 * Pages are seeded with indexed:true so they appear in generateStaticParams.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

// ─── Quiz definitions ────────────────────────────────────────────────────────

const QUIZ_WHEELS = [
  {
    slug: "general-knowledge-quiz-wheel",
    title: "General Knowledge Quiz Wheel",
    description:
      "Spin the wheel and answer random general knowledge trivia questions! Perfect for quiz nights, classrooms, and casual learning. Test history, science, geography and more.",
    tags: ["quiz", "trivia", "general-knowledge", "education", "game"],
    segments: [
      {
        text: "Geography",
        question: "What is the capital city of Australia?",
        options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Science",
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "History",
        question: "In which year did World War II end?",
        options: ["1943", "1944", "1945", "1946"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Math",
        question: "What is the square root of 144?",
        options: ["10", "11", "12", "13"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Literature",
        question: "Who wrote the play 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Homer"],
        correctIndex: 1,
        weight: 1,
        visible: true,
      },
      {
        text: "Animals",
        question: "What is the fastest land animal?",
        options: ["Lion", "Horse", "Cheetah", "Greyhound"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Space",
        question: "How many planets are in our Solar System?",
        options: ["7", "8", "9", "10"],
        correctIndex: 1,
        weight: 1,
        visible: true,
      },
      {
        text: "Food",
        question: "Which country is the origin of Sushi?",
        options: ["China", "Korea", "Thailand", "Japan"],
        correctIndex: 3,
        weight: 1,
        visible: true,
      },
    ],
  },
  {
    slug: "harry-potter-quiz-wheel",
    title: "Harry Potter Quiz Wheel",
    description:
      "How well do you know the Wizarding World? Spin the wheel and answer Harry Potter trivia questions covering all seven books and eight movies. Great for Potterheads!",
    tags: ["quiz", "harry-potter", "trivia", "movies", "books", "game"],
    segments: [
      {
        text: "Hogwarts",
        question: "Which Hogwarts house is known for bravery and courage?",
        options: ["Slytherin", "Ravenclaw", "Gryffindor", "Hufflepuff"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Spells",
        question: "What spell is used to disarm an opponent?",
        options: ["Stupefy", "Expelliarmus", "Lumos", "Accio"],
        correctIndex: 1,
        weight: 1,
        visible: true,
      },
      {
        text: "Characters",
        question: "What is the name of Harry Potter's owl?",
        options: ["Crookshanks", "Scabbers", "Hedwig", "Fawkes"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Creatures",
        question: "What creature guards the entrance to Gringotts bank?",
        options: ["Trolls", "Giants", "Dragons", "Hippogriffs"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Potions",
        question: "What does the Polyjuice Potion allow you to do?",
        options: [
          "Become invisible",
          "Transform into another person",
          "Fly without a broom",
          "Read minds",
        ],
        correctIndex: 1,
        weight: 1,
        visible: true,
      },
      {
        text: "Places",
        question: "Where do the Weasleys live?",
        options: ["Privet Drive", "Godric's Hollow", "The Burrow", "Azkaban"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Quidditch",
        question: "What is the name of the golden Quidditch ball Harry must catch?",
        options: ["Bludger", "Quaffle", "Snitch", "Nimbus"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Horcruxes",
        question: "How many Horcruxes did Voldemort create in total?",
        options: ["5", "6", "7", "8"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
    ],
  },
  {
    slug: "world-capitals-quiz-wheel",
    title: "World Capitals Quiz Wheel",
    description:
      "Spin the wheel and test your world capitals knowledge! A geography quiz covering countries from every continent. Perfect for students, teachers, and travel lovers.",
    tags: ["quiz", "geography", "capitals", "education", "world", "countries"],
    segments: [
      {
        text: "Europe",
        question: "What is the capital of Portugal?",
        options: ["Madrid", "Barcelona", "Lisbon", "Porto"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Asia",
        question: "What is the capital of Japan?",
        options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "South America",
        question: "What is the capital of Brazil?",
        options: ["São Paulo", "Rio de Janeiro", "Salvador", "Brasília"],
        correctIndex: 3,
        weight: 1,
        visible: true,
      },
      {
        text: "Africa",
        question: "What is the capital of Egypt?",
        options: ["Alexandria", "Cairo", "Luxor", "Giza"],
        correctIndex: 1,
        weight: 1,
        visible: true,
      },
      {
        text: "Oceania",
        question: "What is the capital of New Zealand?",
        options: ["Auckland", "Christchurch", "Wellington", "Dunedin"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "North America",
        question: "What is the capital of Canada?",
        options: ["Toronto", "Vancouver", "Montreal", "Ottawa"],
        correctIndex: 3,
        weight: 1,
        visible: true,
      },
      {
        text: "Middle East",
        question: "What is the capital of Saudi Arabia?",
        options: ["Mecca", "Medina", "Riyadh", "Jeddah"],
        correctIndex: 2,
        weight: 1,
        visible: true,
      },
      {
        text: "Eastern Europe",
        question: "What is the capital of Poland?",
        options: ["Kraków", "Gdańsk", "Łódź", "Warsaw"],
        correctIndex: 3,
        weight: 1,
        visible: true,
      },
    ],
  },
];

// ─── Wheel defaults ───────────────────────────────────────────────────────────

const DEFAULT_WHEEL_DATA = {
  segColors: [
    "#3369E8",
    "#D50F25",
    "#EEB211",
    "#009925",
    "#8B00FF",
    "#FF6600",
    "#00CED1",
    "#FF1493",
  ],
  innerRadius: 0,
  spinDuration: 3000,
  maxNumberOfOptions: 200,
  mysteryMode: false,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const wheelsCol = db.collection("wheels");
  const pagesCol = db.collection("pages");

  for (const quiz of QUIZ_WHEELS) {
    // Upsert Wheel
    const wheelResult = await wheelsCol.findOneAndUpdate(
      { slug: quiz.slug }, // use slug as stable identifier on wheel too
      {
        $set: {
          title: quiz.title,
          description: quiz.description,
          data: quiz.segments,
          type: "quiz",
          tags: quiz.tags,
          createdBy: "admin",
          wheelData: DEFAULT_WHEEL_DATA,
          slug: quiz.slug,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date(), likeCount: 0, viewCount: 0 },
      },
      { upsert: true, returnDocument: "after" }
    );

    const wheelId =
      wheelResult?._id ?? wheelResult?.value?._id ?? wheelResult?.lastErrorObject?.upserted;

    // Upsert Page
    await pagesCol.updateOne(
      { slug: quiz.slug },
      {
        $set: {
          title: quiz.title,
          description: quiz.description,
          slug: quiz.slug,
          indexed: true,
          wheel: wheelId,
          content: [],
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    console.log(`✓  ${quiz.slug}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
