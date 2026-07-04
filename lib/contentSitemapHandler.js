/**
 * lib/contentSitemapHandler.js
 *
 * Shared sitemap generator for all content types (movie, anime, game, character).
 * Each type-specific route at app/(content)/{type}/sitemap.xml/route.js calls this.
 */

import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";

const BASE_URL = "https://www.spinpapa.com";

const adultWords = [
  "porn", "sex", "nude", "naked", "xxx", "hentai", "erotic", "nsfw",
  "adult", "18+", "milf", "pussy", "cock", "penis", "vagina", "boobs",
];

function isAdult(slug) {
  return adultWords.some((term) => slug.toLowerCase().includes(term));
}

export async function buildContentSitemap(type) {
  await connectMongoDB();

  const pages = await TopicPage.find({ type }, { slug: 1 }).lean();

  const urls = pages
    .filter((page) => page.slug && !isAdult(page.slug))
    .map(
      (page) =>
        `  <url><loc>${BASE_URL}/${type}/${page.slug}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`
    );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
