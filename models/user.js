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
  },
  { timestamps: true }
);

// /profile/[name] looks users up by display name. Without an index on `name`
// this is a full collection scan that grows linearly with user count.
userSchema.index({ name: 1 });

const User =  models.User || mongoose.model("User", userSchema);
export default User;