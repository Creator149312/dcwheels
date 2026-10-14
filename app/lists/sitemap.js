import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";

const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 86400; // once per day

export default async function sitemap() {
  await connectMongoDB();

  const lists = await UnifiedList.find({
    isPublic: true,
    indexed: true,
    isDeleted: { $ne: true },
    isSystem: { $ne: true },
  })
    .select("_id slug updatedAt")
    .limit(1000)
    .lean();

  console.log(`[Sitemap] Lists count: ${lists.length}`);

  return lists.map((list) => ({
    url: `${BASE_URL}${getListUrl(list)}`.trim(),
    lastModified: list.updatedAt ? new Date(list.updatedAt) : new Date(),
  }));
}
