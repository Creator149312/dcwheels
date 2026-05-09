import mongoose, {Schema, models} from "mongoose";

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
      type: Boolean,
      default: false,
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
  },
  { timestamps: true }
);

// /profile/[name] looks users up by display name. Without an index on `name`
// this is a full collection scan that grows linearly with user count.
userSchema.index({ name: 1 });

const User =  models.User || mongoose.model("User", userSchema);
export default User;