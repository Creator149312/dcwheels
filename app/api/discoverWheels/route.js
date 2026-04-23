import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import { slugify } from "@utils/HelperFunctions";
import { sessionData, sessionUserId } from "@utils/SessionData";
import { callOpenAI } from "@components/actions/actions";

// ---------------------------------------------------------------------------
// /api/discoverWheels
//
// Given a free-form prompt + optional context, returns a ranked list of
// candidate wheel titles to create, each annotated with whether it already
// exists in the DB. Source priority:
//
//   1. Wikipedia MediaWiki API (free, structured, verifiable)
//   2. LLM reshape — only to re-title the bounded Wikipedia list
//   3. LLM-only fallback when Wikipedia returns nothing useful
//
// The LLM is never asked to *invent* entities, only to reshape a provided
// list. That eliminates hallucinated titles for a "Dota 2 characters" prompt.
// ---------------------------------------------------------------------------

const WIKI_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const WIKI_USER_AGENT =
  "SpinpapaWheelsDiscovery/1.0 (https://spinpapa.com; admin@spinpapa.com)";

const BANNED_WORDS = [
  "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
  "kill", "murder", "terrorist", "weapon", "abuse",
];

const hasBanned = (text = "") => {
  const lc = text.toLowerCase();
  return BANNED_WORDS.some((w) => lc.includes(w));
};

async function wikiFetch(params) {
  const url = new URL(WIKI_ENDPOINT);
  Object.entries({ format: "json", origin: "*", ...params }).forEach(
    ([k, v]) => url.searchParams.set(k, String(v))
  );
  const res = await fetch(url, { headers: { "User-Agent": WIKI_USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

// Step A: resolve the prompt to a canonical Wikipedia page (if any).
async function resolveTopic(prompt) {
  const data = await wikiFetch({
    action: "query",
    list: "search",
    srsearch: prompt,
    srlimit: 1,
  });
  return data?.query?.search?.[0] || null;
}

// Step B: pull related entities — category members of the topic's categories,
// plus any "List of …" articles that exist. Caps output to keep cost low.
async function fetchEntities(topicTitle, limit = 40) {
  // B1: look for a "List of X" article first — usually the jackpot.
  const listSearch = await wikiFetch({
    action: "query",
    list: "search",
    srsearch: `List of ${topicTitle}`,
    srlimit: 3,
    srprop: "size",
  });
  const listHits = (listSearch?.query?.search || []).filter((h) =>
    /^list of /i.test(h.title)
  );

  const entities = [];
  const seen = new Set();
  const push = (title, source) => {
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    if (hasBanned(title)) return;
    seen.add(key);
    entities.push({ title, source });
  };

  // B2: try pulling links from the first list article's content.
  if (listHits.length) {
    const linksData = await wikiFetch({
      action: "query",
      prop: "links",
      titles: listHits[0].title,
      plnamespace: 0,
      pllimit: limit,
    });
    const pages = linksData?.query?.pages || {};
    for (const pid of Object.keys(pages)) {
      for (const link of pages[pid].links || []) {
        push(link.title, "wikipedia-list");
        if (entities.length >= limit) break;
      }
      if (entities.length >= limit) break;
    }
  }

  // B3: fall back to category members if list didn't fill the quota.
  if (entities.length < limit) {
    const catData = await wikiFetch({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${topicTitle}`,
      cmlimit: limit - entities.length,
      cmtype: "page",
    });
    for (const m of catData?.query?.categorymembers || []) {
      push(m.title, "wikipedia-category");
      if (entities.length >= limit) break;
    }
  }

  return entities;
}

// Step C: LLM-driven candidate generation.
// Asks for *wheel-title angles* about the topic (e.g. for "Dota 2" →
// ["Heroes", "Items", "Roles", "Maps", "Arcanas"]) rather than segment-level
// items. Wikipedia's list/category extraction tends to be too niche
// (individual hero pages) so LLM produces more useful generic buckets.
async function llmCandidates(prompt, context, userId, limit) {
  const finalPrompt = `
You are helping brainstorm spin-wheel picker ideas. Output ONLY a JSON array of strings.

Topic: "${prompt}"
${context ? `Context: "${context}"` : ""}

Task: list ${limit} distinct, broadly-appealing wheel *topic angles* people
would actually want a spin wheel for. These become wheel titles like
"<angle> Picker Wheel". Prefer common, popular buckets over niche trivia.

Rules:
- Short noun phrases, title case.
- No duplicates, no near-duplicates ("Heroes" and "Hero Picks" are the same).
- No meta items like "Random Thing", "Anything", "Miscellaneous".
- Stay relevant to the topic — don't drift.
- Skip NSFW / violent themes.

Example for topic "Dota 2":
["Dota 2 Heroes", "Dota 2 Items", "Dota 2 Roles", "Dota 2 Maps", "Dota 2 Arcanas"]

Example for topic "Breakfast":
["Breakfast Dishes", "Breakfast Drinks", "Breakfast Cereals", "Pancake Toppings", "Breakfast Smoothie Flavors"]

Now output the JSON array for "${prompt}".
`;
  const resp = await callOpenAI(
    userId,
    finalPrompt,
    { max_tokens: 400, temperature: 0.7 },
    `discover-fallback:${prompt}`
  );
  const text = resp.choices?.[0]?.message?.content?.trim() || "[]";
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => typeof x === "string" && !hasBanned(x))
      .slice(0, limit)
      .map((title) => ({ title, source: "ai" }));
  } catch {
    return [];
  }
}

// Step D: turn each entity into a wheel-shaped title + slug, annotate DB
// existence in one lookup.
async function annotateWithDb(candidates, templateTitle) {
  const normalized = candidates.map((c) => {
    const wheelTitle = `${c.title} ${templateTitle}`.replace(/\s+/g, " ").trim();
    const slug = slugify(wheelTitle);
    return {
      entity: c.title,
      wheelTitle,
      slug,
      source: c.source,
      exists: false,
      existingTitle: null,
    };
  });

  const slugs = normalized.map((c) => c.slug).filter(Boolean);
  if (!slugs.length) return normalized;

  const existing = await Page.find({ slug: { $in: slugs } })
    .select("slug title")
    .lean();
  const existingMap = new Map(existing.map((p) => [p.slug, p.title]));

  return normalized.map((c) =>
    existingMap.has(c.slug)
      ? { ...c, exists: true, existingTitle: existingMap.get(c.slug) }
      : c
  );
}

export async function POST(req) {
  try {
    const session = await sessionData();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = await sessionUserId();

    const {
      prompt,
      context = "",
      limit: rawLimit = 30,
      template: rawTemplate = "Picker Wheel",
      source: rawSource = "ai", // "ai" (default) | "wikipedia" | "both"
    } = await req.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ message: "Missing prompt" }, { status: 400 });
    }
    if (hasBanned(prompt) || hasBanned(context)) {
      return NextResponse.json(
        { message: "Prompt contains banned terms" },
        { status: 400 }
      );
    }

    const limit = Math.min(Math.max(Number(rawLimit) || 30, 1), 50);
    const template = String(rawTemplate).slice(0, 40) || "Picker Wheel";
    const source = ["ai", "wikipedia", "both"].includes(rawSource)
      ? rawSource
      : "ai";

    await connectMongoDB();

    let topic = null;
    let entities = [];

    // AI-first: more generic, broadly-appealing wheel angles. Wikipedia can
    // be opted into when the user wants entity-level lists (every hero, every
    // Pokémon, every country, etc.).
    if (source === "ai" || source === "both") {
      try {
        entities = await llmCandidates(prompt, context, userId, limit);
      } catch (llmErr) {
        console.warn("LLM discovery failed:", llmErr?.message);
      }
    }

    if (source === "wikipedia" || source === "both") {
      try {
        topic = await resolveTopic(prompt);
        if (topic?.title) {
          const wiki = await fetchEntities(
            topic.title,
            Math.max(limit - entities.length, 1)
          );
          entities = [...entities, ...wiki];
        }
      } catch (wikiErr) {
        console.warn("Wikipedia discovery failed:", wikiErr?.message);
      }
    }

    // Safety net: if the chosen source returned nothing, try the other one
    // so the user never gets an empty review screen.
    if (!entities.length && source === "ai") {
      try {
        topic = await resolveTopic(prompt);
        if (topic?.title) entities = await fetchEntities(topic.title, limit);
      } catch {}
    } else if (!entities.length && source === "wikipedia") {
      try {
        entities = await llmCandidates(prompt, context, userId, limit);
      } catch {}
    }

    // Final de-dupe by lowercase title so AI + Wikipedia don't double-list.
    const seen = new Set();
    entities = entities
      .filter((e) => {
        const k = e.title.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, limit);

    if (!entities.length) {
      return NextResponse.json(
        {
          candidates: [],
          topic: topic?.title || null,
          source,
          message: "No candidates found",
        },
        { status: 200 }
      );
    }

    // Shape into wheel titles + slugs + DB annotation.
    const candidates = await annotateWithDb(entities, template);

    return NextResponse.json(
      {
        topic: topic?.title || null,
        template,
        source,
        candidates,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("discoverWheels error:", err);
    return NextResponse.json(
      { message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
