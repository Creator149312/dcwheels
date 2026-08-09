import apiConfig from "@utils/ApiUrlConfig";

/**
 * Shared helper for local-first TopicPage search used by content sections.
 * Falls back to empty results on any failure so the UI never crashes.
 */
export async function fetchLocalTopics({ q, type, page = 1, limit = 12 }) {
  try {
    const url = new URL(`${apiConfig.baseUrl}/api/search/topics`);
    url.searchParams.set("q", q);
    url.searchParams.set("type", type);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Topic search failed: ${res.status}`);

    const data = await res.json();
    return { results: data.results || [], meta: data.meta || {} };
  } catch (err) {
    console.error(`fetchLocalTopics(${type}) error:`, err.message);
    return { results: [], meta: { total: 0 } };
  }
}
