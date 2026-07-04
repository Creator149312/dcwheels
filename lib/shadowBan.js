/**
 * shadowBanUser — marks a user as shadow-banned and propagates the flag
 * to all their posts so the feed filter immediately excludes them.
 *
 * Called automatically when:
 *   - A user's content accumulates 5 community reports (auto-moderate)
 *   - A user posts 10+ times in 60 seconds (rate-limit spam)
 *   - A user drops a raw URL link in a post or comment (link-spam guard)
 */
import User from "@models/user";
import Post from "@models/post";

export async function shadowBanUser(userId) {
  // Mark the user account
  await User.findByIdAndUpdate(userId, { shadowBanned: true });
  // Propagate to all their posts so the feed query picks it up instantly
  await Post.updateMany({ userId }, { shadowBanned: true });
}
