import User from "@models/user";

/**
 * Extend (or reset) a user's vote streak after a successful vote.
 *
 * Rules:
 *  - Voted today already?  → no change (idempotent; the vote was deduplicated
 *    by AskVote anyway, but this guard prevents a double-write race).
 *  - Voted yesterday?      → increment streak by 1.
 *  - Missed one or more days? → reset streak to 1.
 * Always updates `lastVotedDate` and `longest` if a new record is set.
 *
 * Called fire-and-forget from POST /api/ask/[id]/vote — errors are swallowed
 * so a failed streak write never impacts the vote response.
 */
export async function updateVoterStreak(userId) {
  try {
    const now = new Date();
    // Midnight UTC for today — stable anchor for day-diff arithmetic.
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const user = await User.findById(userId).select("voteStreak").lean();
    if (!user) return;

    const lastDate = user.voteStreak?.lastVotedDate
      ? new Date(user.voteStreak.lastVotedDate)
      : null;

    let current = user.voteStreak?.current || 0;
    let longest = user.voteStreak?.longest || 0;

    if (lastDate) {
      // Normalise lastDate to midnight UTC for comparison
      const lastUTC = new Date(
        Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate())
      );
      const diffDays = Math.round((todayUTC - lastUTC) / 86_400_000);

      if (diffDays === 0) return;          // already updated today
      if (diffDays === 1) current += 1;   // consecutive day
      else current = 1;                   // gap — reset
    } else {
      current = 1; // first-ever vote
    }

    longest = Math.max(longest, current);

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "voteStreak.current":       current,
          "voteStreak.longest":       longest,
          "voteStreak.lastVotedDate": todayUTC,
        },
      }
    );
  } catch (err) {
    console.error("updateVoterStreak failed:", err);
  }
}
