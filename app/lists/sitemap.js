import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";

const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 86400; // once per day

export default async function sitemap() {
  await connectMongoDB();

  const lists = await UnifiedList.find({
    isPublic: true,
    isDeleted: { $ne: true },
  })
    .select("_id updatedAt")
    .limit(1000)
    .lean();

  return lists.map((list) => ({
    url: `${BASE_URL}${getListUrl(list)}`.trim(),
    lastModified: list.updatedAt ? new Date(list.updatedAt) : new Date(),
  }));
}
