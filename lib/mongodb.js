import mongoose from "mongoose";

// Guard against redundant mongoose.connect() calls during Next.js hot-reload.
// readyState values: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting.
// We only attempt a new connection when the state is 0 (disconnected).
export const connectMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    // Already connected or connecting — reuse the existing connection
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    return {
      error: "Error connecting to database, Please check your Connection!",
    };
  }
};
