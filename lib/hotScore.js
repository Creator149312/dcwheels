/**
 * lib/hotScore.js
 *
 * Logarithmic Epoch-Based HotScore Engine (Reddit-style O(1) write, O(log N) read).
 *
 * Formula:
 *   hotScore = createdAtSeconds + round(log10(max(points, 1)) * 43200)
 *
 * Where:
 *   points = (votes * 1) + (likes * 2) + (comments * 4)
 *   43200 seconds = 12 hours boost per 10x order of magnitude of engagement.
 *
 * Properties:
 *   - Zero read-time CPU math: stored directly on Post, Wheel, and UnifiedList.
 *   - Zero cron jobs: newer posts naturally have higher createdAtSeconds, so older
 *     posts gracefully decay down the feed over time without background jobs.
 *   - Scale-invariant: log10 diminishing returns prevent viral posts or high-traffic
 *     categories from pinning items to the top forever.
 */

const EPOCH_BOOST_SECONDS = 43200; // 12 hours per order of magnitude (log10)

/**
 * Compute the logarithmic epoch hotScore for a document.
 *
 * @param {Object} params
 * @param {Date|string|number} [params.createdAt] - Creation timestamp (defaults to now)
 * @param {number} [params.votes=0] - Total poll votes (for posts)
 * @param {number} [params.likes=0] - Total like count
 * @param {number} [params.comments=0] - Total comment count
 * @returns {number} Integer hotScore in epoch seconds
 */
export function computeHotScore({
  createdAt = Date.now(),
  votes = 0,
  likes = 0,
  comments = 0,
} = {}) {
  const dateMs =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === "number"
      ? createdAt
      : new Date(createdAt || Date.now()).getTime();

  const createdSec = Math.floor((Number.isNaN(dateMs) ? Date.now() : dateMs) / 1000);

  const safeVotes = Math.max(0, Number(votes) || 0);
  const safeLikes = Math.max(0, Number(likes) || 0);
  const safeComments = Math.max(0, Number(comments) || 0);

  const points = safeVotes * 1 + safeLikes * 2 + safeComments * 4;
  const boostSec =
    points > 0 ? Math.round(Math.log10(points + 1) * EPOCH_BOOST_SECONDS) : 0;

  return createdSec + boostSec;
}

/**
 * Helper to sum poll votes from a Post's pollOptions array.
 */
export function sumPollVotes(pollOptions) {
  if (!Array.isArray(pollOptions) || pollOptions.length === 0) return 0;
  return pollOptions.reduce((sum, opt) => sum + (Number(opt?.voteCount) || 0), 0);
}

/**
 * Recompute and persist hotScore for a Post, Wheel, or UnifiedList by ID.
 * Designed to be called right after atomic $inc updates on vote/like/comment.
 */
export async function refreshEntityHotScore(Model, entityId) {
  if (!Model || !entityId) return null;
  try {
    const doc = await Model.findById(entityId)
      .select("createdAt likeCount commentCount pollOptions")
      .lean();
    if (!doc) return null;

    const votes = sumPollVotes(doc.pollOptions);
    const newHotScore = computeHotScore({
      createdAt: doc.createdAt,
      votes,
      likes: doc.likeCount || 0,
      comments: doc.commentCount || 0,
    });

    await Model.updateOne({ _id: entityId }, { $set: { hotScore: newHotScore } });
    return newHotScore;
  } catch (err) {
    console.error("[refreshEntityHotScore] failed:", err?.message);
    return null;
  }
}
