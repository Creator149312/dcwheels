import SearchEmptyState from "@components/search/SearchEmptyState";
import { fetchLocalTopics } from "./fetchLocalTopics";
import LoadMoreTopics from "./LoadMoreTopics";

/**
 * Shared content section for anime, movie, game, and character search tabs.
 * Accepts the topic type, display label, server-fetched initial data, and an
 * optional badge type for result cards.
 */
export default async function TopicSection({
  searchtitle,
  type,
  label,
  initialData,
  badgeType = "star",
}) {
  const { results, meta } = initialData?.results
    ? initialData
    : await fetchLocalTopics({ q: searchtitle, type });

  if (!results || results.length === 0) {
    return <SearchEmptyState query={searchtitle} label={label} />;
  }

  const total = meta?.total ?? results.length;
  const pluralLabel = pluralize(label, total);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 font-medium px-1">
        Found {total} {pluralLabel}
      </p>
      <LoadMoreTopics
        key={type}
        searchtitle={searchtitle}
        type={type}
        label={label}
        initialResults={results}
        initialMeta={meta}
        badgeType={badgeType}
      />
    </div>
  );
}

function pluralize(word, count) {
  if (count === 1) return word;
  // Some labels like "anime" are already plural in common usage.
  if (word.endsWith("s") || word === "anime") return word;
  return `${word}s`;
}
