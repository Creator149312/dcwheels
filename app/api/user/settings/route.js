import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import { sessionUserId } from "@utils/SessionData";

/**
 * Reserved usernames that cannot be claimed by users.
 * Protects system routes, API endpoints, and platform identity.
 */
const RESERVED_USERNAMES = new Set([
  // System & Platform
  "spinpapa", "spinwheel", "admin", "staff", "system", "app",
  
  // Auth & Account
  "auth", "auth0", "account", "accounts", "login", "logout",
  "signup", "register", "password", "verify", "reset",
  
  // Core Routes & Features
  "api", "dashboard", "home", "feed", "explore", "search",
  "profile", "settings", "wheel", "wheels", "list", "lists",
  "post", "posts", "tag", "tags", "ask", "decision",
  
  // Support & Help
  "support", "help", "contact", "feedback", "report",
  
  // Common/Abuse Prevention
  "root", "moderator", "bot", "automation", "test", "demo",
  "dev", "development", "staging", "production",
  
  // Web Standard
  "www", "mail", "ftp", "smtp", "ssh",
  
  // Reserved for Future
  "team", "community", "organization", "company", "brand"
]);

/**
 * /api/user/settings — read + update the currently-authenticated user's
 * privacy/preference flags. Currently exposes only `publicSpins` (whether
 * saved decisions appear in the public per-wheel "Spin Stories" feed); the
 * shape is deliberately flat so future flags can be added without breaking
 * the client.
 *
 * GET returns 401 (not 200 with empty body) for guests so the client UI
 * can clearly differentiate "not logged in" from "logged in, all defaults".
 */
export async function GET() {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId).select("publicSpins bio website name username").lean();
    return NextResponse.json({
      settings: {
        publicSpins: !!user?.publicSpins,
        bio: user?.bio || "",
        website: user?.website || "",
        name: user?.name || "",
        username: user?.username || "",
      },
    });
  } catch (err) {
    console.error("User settings GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Whitelist fields explicitly. Anything not in this set is ignored
    // even if the client sends it — keeps role/email/etc. tamper-proof
    // through this endpoint.
    const update = {};
    if (typeof body.publicSpins === "boolean") {
      update.publicSpins = body.publicSpins;
    }

    if (typeof body.bio === "string") {
      update.bio = body.bio.substring(0, 160);
    }

    if (typeof body.website === "string") {
      update.website = body.website.substring(0, 100);
    }

    if (typeof body.name === "string" && body.name.trim().length > 0) {
      const trimmedName = body.name.trim().substring(0, 50);
      update.name = trimmedName;
    }

    if (typeof body.username === "string" && body.username.trim().length > 0) {
      const username = body.username.trim().toLowerCase().substring(0, 40);
      
      // Username pattern: 3-40 chars, alphanumeric + dots/underscores/hyphens
      // BUT cannot start/end with special chars (., _, -)
      // Valid: john-doe, user.name, test_user, john123
      // Invalid: -john, _user, .name, john-, user_, name.
      if (!/^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(username)) {
        return NextResponse.json(
          { error: "Username must be 3-40 chars, start/end with letter or number, and can contain dots, underscores, or hyphens in the middle." },
          { status: 400 }
        );
      }

      // Check if username is reserved
      if (RESERVED_USERNAMES.has(username)) {
        return NextResponse.json(
          { error: `The username "${username}" is reserved and cannot be used. Please choose another.` },
          { status: 400 }
        );
      }

      // Check for uniqueness
      const existingUser = await User.findOne({
        username: username,
        _id: { $ne: userId }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 400 }
        );
      }
      update.username = username;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Retrieve user and save through document layer so the Mongoose pre-save hook triggers
    // This ensures pre-save username generation and uniqueness checks execute.
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Apply updates manually to trigger hooks on save()
    const oldUsername = user.username;
    Object.keys(update).forEach((key) => {
      user[key] = update[key];
    });

    await user.save();

    // If username changed, propagate to Posts and Wheels to keep them in sync
    // This maintains "O(1) author lookup" in feed views.
    if (update.username && oldUsername !== user.username) {
      // Lazy import models to avoid circular dependencies (if any) or early load
      const Post = (await import("@models/post")).default;
      const Wheel = (await import("@models/wheel")).default;
      
      await Promise.all([
        Post.updateMany({ userId }, { authorHandle: user.username }),
        Wheel.updateMany({ createdBy: user.email }, { authorHandle: user.username })
      ]);
    }

    return NextResponse.json({
      settings: {
        publicSpins: !!user?.publicSpins,
        bio: user?.bio || "",
        website: user?.website || "",
        name: user?.name || "",
        username: user?.username || "",
      },
    });
  } catch (err) {
    console.error("User settings PATCH error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
