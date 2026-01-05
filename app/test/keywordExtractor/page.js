"use client";
import { useState, useEffect } from "react";

export default function XmlReader() {
  const [urls, setUrls] = useState([]);
  const [canonicalSlugs, setCanonicalSlugs] = useState([]);

  // Canonicalize slug by removing noise tokens
  function canonicalizeSlug(slug) {
    const noise = new Set([
      "rerendered",
      "updated",
      "new",
      "latest",
      "info",
      "details",
      "page",
      "site",
      "official"
    ]);

    return slug
      .split(/[-_]/)
      .filter(token => {
        // remove years and noise words
        return !noise.has(token.toLowerCase()) && !/^\d{4}$/.test(token);
      })
      .join("-");
  }

  // Detect random ID pattern (alphanumeric suffixes like 7ZxH, 12tBr, etc.)
  function hasRandomId(slug) {
    const parts = slug.split("-");
    const last = parts[parts.length - 1];
    return /[A-Za-z]/.test(last) && /\d/.test(last) && last.length >= 3;
  }

  // Detect "copy-of" slugs
  function isCopyOf(slug) {
    return slug.toLowerCase().startsWith("copy-of-");
  }

  // Process XML file directly from public directory
  useEffect(() => {
    async function loadXml() {
      console.log("🔄 Fetching sitemap.xml...");
      const res = await fetch("/sitemapIndex.xml"); // file must be in /public
      const text = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "application/xml");

      const locNodes = xmlDoc.getElementsByTagName("loc");
      const locValues = Array.from(locNodes).map((node) => node.textContent);

      console.log("📌 Extracted URLs:", locValues);
      setUrls(locValues);

      const canonicalSet = new Set(
        locValues
          .map(url => {
            const slug = url.replace("https://spinthewheel.app/", "").trim();

            if (hasRandomId(slug)) {
              console.log("⏭️ Skipping random ID slug:", slug);
              return null;
            }
            if (isCopyOf(slug)) {
              console.log("⏭️ Skipping copy-of slug:", slug);
              return null;
            }

            const canonical = canonicalizeSlug(slug);
            console.log("➡️ Canonicalized:", slug, "→", canonical);
            return canonical;
          })
          .filter(Boolean)
      );

      // Sort alphabetically
      const sorted = [...canonicalSet].sort((a, b) => a.localeCompare(b));

      setCanonicalSlugs(sorted);
      console.log("✅ Final canonical slugs (sorted):", sorted);
    }

    loadXml();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Processed XML File</h2>

      {urls.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Extracted URLs:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {urls.map((url, idx) => (
              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canonicalSlugs.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">
            Canonical Slugs (Sorted, Deduplicated, Random IDs & Copy-of Skipped):
          </h3>
          <ul className="list-decimal pl-5 space-y-1">
            {canonicalSlugs.map((slug, idx) => (
              <li key={idx} className="text-sm text-blue-700 dark:text-blue-300">
                {slug}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
