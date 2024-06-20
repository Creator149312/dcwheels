import mongoose from "mongoose";

export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    return {
      error: "Error connecting to database, Please check your Connection!",
    };
  }
};
