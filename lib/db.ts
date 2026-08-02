import mongoose from "mongoose";
import dns from "node:dns";

// Some local/ISP networks block MongoDB Atlas SRV lookups; Google DNS works around
// that. Vercel's own resolver doesn't have this problem, so leave it untouched there.
if (process.env.VERCEL !== "1") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch {
    /* ignore if already set */
  }
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Add your MongoDB Atlas connection string to .env.local",
    );
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

/**
 * Reuses a single MongoDB connection across hot reloads in development
 * and serverless invocations in production (Vercel).
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
