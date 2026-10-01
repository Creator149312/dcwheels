import { buildContentSitemap } from "@/lib/contentSitemapHandler";

export async function GET(request, { params }) {
  const { type } = await params;
  return buildContentSitemap(type);
}
