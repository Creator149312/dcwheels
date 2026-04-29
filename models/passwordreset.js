import mongoose, { Schema, models } from "mongoose";

const passwordReset = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // Enforces uniqueness for email
    },
    token: {
      type: String,
      required: true,
      unique: true, //enforces uniqueness for email
    },
    expires: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL: auto-delete password-reset tokens once `expires` passes. Same
// rationale as EmailVerificationToken — single-use, no value after
// expiry, keeps the unique-index footprint bounded.
passwordReset.index({ expires: 1 }, { expireAfterSeconds: 0 });

const PasswordReset =
  models.PasswordReset || mongoose.model("PasswordReset", passwordReset);
export default PasswordReset;
