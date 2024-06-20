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
      required: true,
      unique: true //enforces uniqueness for email
    }, 
    password: {
      type: String,
      required: true
    },
    emailVerified: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const User =  models.User || mongoose.model("User", userSchema);
export default User;