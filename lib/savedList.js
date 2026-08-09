// Centralized helper for the per-user "Saved" system list (systemKey: SYS_SAVED).
//
// Why this file exists:
// - Saved-list creation/migration logic was duplicated across auth routes,
//   GET /api/unifiedlist, quick-track, and signup actions.
// - Consolidating it here keeps the semantics in one place and makes the
//   hot paths read-only by default.
//
// Rules:
// - Every registered user has exactly one SYS_SAVED list.
// - The list is isSystem=true, isPublic=true, name="Saved".
// - It cannot be renamed or deleted (enforced in app/api/unifiedlist/[id]/route.js).

import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";

const SAVED_NAME = "Saved";
const SAVED_KEY = "SYS_SAVED";
const SAVED_DESCRIPTION = "Default list for items you've saved.";

/**
 * Find the user's SYS_SAVED list. Returns null if none exists.
 * Does NOT create anything.
 */
export async function getSavedList(userId) {
  await connectMongoDB();
  return UnifiedList.findOne({
    userId,
    systemKey: SAVED_KEY,
    isDeleted: { $ne: true },
  }).lean();
}

/**
 * Ensure the user's SYS_SAVED list exists.
 * - If it already exists, return it unchanged.
 * - If a legacy "Saved" list exists (case-insensitive), upgrade it.
 * - Otherwise create a fresh system list.
 *
 * Safe to call from registration, migration scripts, or lazy-creation paths.
 */
export async function ensureSavedListExists(userId) {
  await connectMongoDB();

  let saved = await UnifiedList.findOne({
    userId,
    systemKey: SAVED_KEY,
    isDeleted: { $ne: true },
  });

  if (saved) return saved;

  // Legacy upgrade: a list named "Saved" without the system key.
  saved = await UnifiedList.findOne({
    userId,
    isDeleted: { $ne: true },
    name: { $regex: /^saved$/i },
  });

  if (saved) {
    saved.isSystem = true;
    saved.systemKey = SAVED_KEY;
    saved.name = SAVED_NAME;
    saved.description = saved.description || SAVED_DESCRIPTION;
    return saved.save();
  }

  // Fresh creation. 11000 duplicate-key errors are swallowed because another
  // concurrent request may have created it between the find and the create.
  try {
    saved = await UnifiedList.create({
      userId,
      name: SAVED_NAME,
      description: SAVED_DESCRIPTION,
      isSystem: true,
      systemKey: SAVED_KEY,
      isPublic: true,
      settings: { sortBy: "recently-saved" },
    });
  } catch (err) {
    if (err.code === 11000) {
      saved = await UnifiedList.findOne({
        userId,
        systemKey: SAVED_KEY,
        isDeleted: { $ne: true },
      });
    } else {
      throw err;
    }
  }

  return saved;
}
