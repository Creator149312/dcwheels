import mongoose, {Schema, models} from "mongoose";

/**
 * Reserved usernames that cannot be claimed by users.
 * Protects system routes, API endpoints, and platform identity.
 */
export const RESERVED_USERNAMES = new Set([
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

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true // Enforces uniqueness for email
    },
    name: {
      type: String,
    },
    password: {
      type: String,
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    authMethod: {
      type: String,
      enum: ['emailPassword', 'google'],
      required: true,
      default: 'emailPassword', // Set default value
    },
    role: {
      // "admin" when user is allowed privileged dashboard actions.
      // Default to "user" — admins are promoted manually in the DB or via
      // the ADMIN_EMAIL env fallback in @utils/auth/isAdmin.
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 160,
    },
    website: {
      type: String,
      default: "",
      maxlength: 100,
    },
    // Opt-in flag for the public per-wheel "Spin Stories" feed. When true,
    // saved decisions (DecisionLog) created by this user are written with
    // `isPublic: true` and surface (with name + avatar) on the wheel page
    // they happened on. Default false keeps everyone private until they
    // explicitly opt in via profile settings — GDPR-safe and avoids
    // surprise privacy issues for existing users.
    publicSpins: {
      type: Boolean,
      default: false,
    },
    // Voter streak — consecutive days the user cast at least one Ask vote.
    // `lastVotedDate` is stored as midnight UTC so day-diff math is stable.
    voteStreak: {
      current:       { type: Number, default: 0, min: 0 },
      longest:       { type: Number, default: 0, min: 0 },
      lastVotedDate: { type: Date },
    },
    // Monthly AI quiz generation quota. Resets every 30 days.
    // `resetAt` marks when the current window expires; on the next call
    // after expiry the count is zeroed and a new window is set.
    aiQuizGenerations: {
      count:   { type: Number, default: 0, min: 0 },
      resetAt: { type: Date },
    },

    // Moderation: shadow-banned users' posts are hidden from the public feed
    // but still visible to themselves (classic shadow-ban UX).
    shadowBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Unique lowercase handle/slug for the user profile URL.
    // e.g., Display name "Creators93" -> username handle "creators93".
    // Enables direct, index-optimized exact match lookups.
    username: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook: Auto-populate lowercase, unique, URL-safe username handle from email prefix
// e.g., purohit12_49@email.com → username: purohit12_49
userSchema.pre("save", async function (next) {
  // Only auto-generate username for new users or if username is missing/not set
  if ((this.isNew || !this.username) && this.email) {
    // Extract the email prefix (part before @)
    let baseUsername = this.email
      .split("@")[0]
      .toLowerCase()
      .trim()
      .replace(/\+[^@]*/g, "")  // Remove + aliases (e.g., john+test → john)
      .substring(0, 40);         // Cap at 40 chars for URL safety

    // Fallback if baseUsername is empty
    if (!baseUsername) {
      baseUsername = "user";
    }

    // Check uniqueness and append counter if needed
    const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
    let uniqueUsername = baseUsername;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      // Skip reserved usernames
      if (RESERVED_USERNAMES.has(uniqueUsername)) {
        uniqueUsername = `${baseUsername}-${counter}`;
        counter++;
        continue;
      }

      // Query to check if the generated username is already in use by another user
      const existingUser = await UserModel.findOne({ username: uniqueUsername })
        .select("_id")
        .lean();
        
      if (!existingUser || String(existingUser._id) === String(this._id)) {
        isUnique = true;
      } else {
        uniqueUsername = `${baseUsername}-${counter}`;
        counter++;
      }
    }
    this.username = uniqueUsername;
  }
  next();
});

// Index for fast lowercase username lookup
userSchema.index({ username: 1 }, { unique: true, sparse: true });

// Regular index for exact name matches (used in other queries)
userSchema.index({ name: 1 });

const User =  models.User || mongoose.model("User", userSchema);
export default User;