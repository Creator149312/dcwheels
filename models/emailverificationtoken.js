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

const EmailVerificationToken = models.EmailVerificationToken || mongoose.model("EmailVerificationToken", emailVerificationToken);
export default EmailVerificationToken;