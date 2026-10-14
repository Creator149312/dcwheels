import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { getWheelUrl } from "@utils/UrlHandler";
import { isCleanText } from "@lib/contentSafety";

const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 86400; // 24 hours

export default async function sitemap() {
  await connectMongoDB();

  // Fetch only high-quality indexed wheels directly from the Wheel collection
  // Protected by Tier 3 wheelIndexGate (indexed: true)
  const indexedWheels = await Wheel.find({
    isPublic: true,
    indexed: true,
    isDeleted: { $ne: true },
  })
    .select("_id slug updatedAt title")
    .limit(45000)
    .lean();

  const entries = indexedWheels
    .filter((w) => isCleanText(w.title) && isCleanText(w.slug))
    .map((w) => ({
      url: `${BASE_URL}${getWheelUrl(w)}`.trim(),
      lastModified: w.updatedAt ? new Date(w.updatedAt) : new Date(),
    }));

  // Dedup URLs
  const seen = new Set();
  const uniqueEntries = [];

  for (const item of entries) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      uniqueEntries.push(item);
    }
  }

  console.log(`[Sitemap] Wheels count: ${uniqueEntries.length} (from ${indexedWheels.length} indexed wheels)`);

  return uniqueEntries;
}
