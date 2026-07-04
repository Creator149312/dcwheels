import { buildContentSitemap } from "@/lib/contentSitemapHandler";
export async function GET() {
  return buildContentSitemap("movie");
}
