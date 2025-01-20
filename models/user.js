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
  },
  { timestamps: true }
);

const User =  models.User || mongoose.model("User", userSchema);
export default User;