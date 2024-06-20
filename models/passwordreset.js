import mongoose, { Schema, models } from "mongoose";

const passwordReset = new Schema(
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
  },
  { timestamps: true }
);

const PasswordReset = models.PasswordReset || mongoose.model("PasswordReset", passwordReset);
export default PasswordReset;