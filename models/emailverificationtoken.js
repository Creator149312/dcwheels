import mongoose, { Schema, models } from "mongoose";

const emailVerificationToken = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true // Enforces uniqueness for email
    },
    token: {
      type: String,
      required: true,
      unique: true //enforces uniqueness for email
    },
    expires: {
        type: Date, 
        required: true,
    }
  }
);

// TTL: Mongo auto-deletes verification tokens once their `expires` Date
// has passed. Tokens are single-use and useless after expiry, so letting
// the database reap them keeps the collection — and its unique indexes
// on `email` and `token` — small forever. Without this, every signup
// permanently grew the collection.
emailVerificationToken.index({ expires: 1 }, { expireAfterSeconds: 0 });

const EmailVerificationToken = models.EmailVerificationToken || mongoose.model("EmailVerificationToken", emailVerificationToken);
export default EmailVerificationToken;