import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";
import { getWheelUrl } from "@utils/UrlHandler";
import { replaceUnderscoreWithDash } from "@utils/HelperFunctions";

const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 86400; // 24 hours

export default async function sitemap() {
  await connectMongoDB();

  const adultWords = [
    "sex",
    "porn",
    "nude",
    "erotic",
    "xxx",
    "fetish",
    "bdsm",
    "naked",
    "boobs",
    "butt",
    "vagina",
    "penis",
    "dildo",
    "orgasm",
    "hentai",
    "anal",
    "cum",
    "intercourse",
    "masturbation",
    "position",
    "sex-position",
  ];

  const isClean = (text) => {
    if (!text || typeof text !== "string") return true;
    const lower = text.toLowerCase();
    return !adultWords.some((term) => lower.includes(term));
  };

  // 1. Fetch Verified / Admin Wheels from Page collection
  const legacyPages = await Page.aggregate([
    { $project: { _id: 0, slug: 1 } },
  ]);

  const adminEntries = legacyPages
    .map((doc) => doc.slug)
    .filter((slug) => slug && isClean(slug))
    .map((slug) => ({
      url: `${BASE_URL}/wheels/${replaceUnderscoreWithDash(slug)}`.trim(),
      lastModified: new Date(),
    }));

  // 2. Fetch High-Quality Indexed User/Community Wheels
  const indexedUserWheels = await Wheel.find({
    isPublic: true,
    indexed: true,
    isDeleted: { $ne: true },
  })
    .select("_id slug updatedAt title")
    .limit(2000)
    .lean();

  const userEntries = indexedUserWheels
    .filter((w) => isClean(w.title) && isClean(w.slug))
    .map((w) => ({
      url: `${BASE_URL}${getWheelUrl(w)}`.trim(),
      lastModified: w.updatedAt ? new Date(w.updatedAt) : new Date(),
    }));

  // Dedup URLs
  const seen = new Set();
  const combined = [];

  for (const item of [...adminEntries, ...userEntries]) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      combined.push(item);
    }
  }

  return combined;
}
