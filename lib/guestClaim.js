import PostVote from "@models/postVote";

/**
 * claimGuestVotes: Migrates any anonymous votes associated with a guestId
 * to a newly signed-in or registered userId.
 *
 * Designed to be fire-and-forget: does not block login/auth flows.
 * Handles duplicate votes gracefully (if user already voted on the same post,
 * drops the redundant guest vote instead of crashing with E11000).
 */
export async function claimGuestVotes(guestId, userId) {
  if (!guestId || !userId) return;

  try {
    const guestVotes = await PostVote.find({ guestId }).lean();
    if (!guestVotes || guestVotes.length === 0) return;

    for (const gVote of guestVotes) {
      const existingUserVote = await PostVote.findOne({
        postId: gVote.postId,
        userId: userId,
      }).lean();

      if (existingUserVote) {
        // Redundant guest vote: user already has an official vote on this post
        await PostVote.deleteOne({ _id: gVote._id });
      } else {
        // Safe to claim: reassign guest vote to userId
        await PostVote.updateOne(
          { _id: gVote._id },
          { $set: { userId: userId, guestId: null } }
        );
      }
    }
  } catch (error) {
    // Fail-safe: don't disrupt session flow if claiming encounters a transient error
    console.error("claimGuestVotes error:", error?.message);
  }
}
