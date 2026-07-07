/**
 * Worth It? Rating & Vote Logic
 * 
 * Centralized conversion thresholds to prevent hardcoded magic numbers
 * across API and components.
 */

/**
 * Rating-to-Vote Conversion Thresholds
 * Ensures consistent vote derivation across client and server
 */
export const RATING_TO_VOTE_THRESHOLDS = {
  yes: { min: 4, max: 5, label: "Worth It" },
  meh: { min: 3, max: 3, label: "It's OK" },
  no: { min: 1, max: 2, label: "Skip It" },
};

/**
 * Convert a star rating (1-5) to a vote category
 * @param {number} rating - Star rating from 1-5
 * @returns {string} - "yes", "meh", or "no"
 */
export function ratingToVote(rating) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Invalid rating: ${rating}. Must be integer 1-5.`);
  }

  if (rating >= RATING_TO_VOTE_THRESHOLDS.yes.min) return "yes";
  if (rating === RATING_TO_VOTE_THRESHOLDS.meh.min) return "meh";
  return "no";
}

/**
 * Get the label for a given star rating
 * @param {number} rating - Star rating from 1-5
 * @returns {string} - Human-readable label
 */
export function getRatingLabel(rating) {
  const vote = ratingToVote(rating);
  return RATING_TO_VOTE_THRESHOLDS[vote].label;
}

/**
 * Calculate consensus percentage (yes votes out of total votes)
 * @param {object} worthIt - { yes, no, meh }
 * @returns {number} - Percentage 0-100, or 0 if no votes
 */
export function calculateConsensusPercent(worthIt = {}) {
  const yesCount = worthIt.yes || 0;
  const noCount = worthIt.no || 0;
  const mehCount = worthIt.meh || 0;
  const totalVotes = yesCount + noCount + mehCount;

  if (totalVotes === 0) return 0;
  return Math.round((yesCount / totalVotes) * 100);
}

/** * Get sentiment metadata based on consensus percentage
 * @param {number} percent - Consensus percentage (0-100)
 * @returns {object} - { color, label, darkColor }
 */
export function getConsensusSentiment(percent) {
  if (percent >= 70) {
    return {
      color: "text-emerald-600",
      darkColor: "dark:text-emerald-400",
      bg: "from-emerald-500/5 to-emerald-500/10",
      border: "border-emerald-200/30 dark:border-emerald-800/30",
      label: "Worth It",
    };
  }
  if (percent >= 40) {
    return {
      color: "text-amber-600",
      darkColor: "dark:text-amber-400",
      bg: "from-amber-500/5 to-amber-500/10",
      border: "border-amber-200/30 dark:border-amber-800/30",
      label: "Mixed",
    };
  }
  return {
    color: "text-red-600",
    darkColor: "dark:text-red-400",
    bg: "from-red-500/5 to-red-500/10",
    border: "border-red-200/30 dark:border-red-800/30",
    label: "Skip It",
  };
}

/** * Calculate average rating
 * @param {object} rating - { totalScore, count }
 * @returns {string} - Formatted to 1 decimal place, or "0" if no ratings
 */
export function calculateAverageRating(rating = {}) {
  const { totalScore = 0, count = 0 } = rating;
  
  if (count === 0) return "0";
  
  const avg = totalScore / count;
  return avg.toFixed(1);
}
