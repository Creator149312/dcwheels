import mongoose from "mongoose";

// Serverless-friendly mongoose client options.
//
// In a Vercel/Lambda environment each cold-started function instance owns
// its own connection pool, and many instances can spin up concurrently.
// The driver's default maxPoolSize is 100, which will happily exhaust
// Atlas's per-cluster connection limit (e.g. M10 = 1500) under load.
// We cap it low and keep timeouts tight so a misbehaving upstream doesn't
// tie up a serverless instance for the full 30s AWS default.
const MONGOOSE_CLIENT_OPTIONS = {
  // Small pool per instance — most serverless invocations only need 1-2
  // concurrent connections, and we'd rather have more instances each with
  // a tiny pool than one instance hogging 100 Atlas slots.
  maxPoolSize: 10,
  minPoolSize: 0,

  // Reap idle connections aggressively so Atlas can reclaim capacity after
  // a traffic spike. Default is infinite.
  maxIdleTimeMS: 30_000,

  // Fail fast on DNS / primary-selection issues instead of hanging the
  // request. Default is 30s.
  serverSelectionTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,
  connectTimeoutMS: 10_000,

  // Skip Mongoose's index-sync on boot in production — indexes are
  // managed explicitly in the models and via Atlas. Cuts cold-start cost.
  autoIndex: process.env.NODE_ENV !== "production",
};

// Cache the connection promise across hot-reloads and across serverless
// invocations that reuse the same Lambda container. Without this cache,
// every API route that calls connectMongoDB() during a single request
// triggers a fresh `mongoose.connect()`.
let cachedPromise = global.__mongooseConnPromise || null;

export const connectMongoDB = async () => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(process.env.MONGODB_URI, MONGOOSE_CLIENT_OPTIONS)
      .catch((err) => {
        // Invalidate the cache on failure so the next call retries
        // instead of being permanently stuck with a rejected promise.
        cachedPromise = null;
        global.__mongooseConnPromise = null;
        throw err;
      });
    global.__mongooseConnPromise = cachedPromise;
  }

  try {
    await cachedPromise;
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return {
      error: "Error connecting to database, Please check your Connection!",
    };
  }
};
