import { NextResponse } from "next/server";

/** Lightweight probe — no DB. Use after deploy to confirm the app is up. */
export async function GET() {
  const hasMongo = Boolean(process.env.MONGODB_URI);
  const hasJwt =
    Boolean(process.env.JWT_SECRET) &&
    (process.env.JWT_SECRET?.length ?? 0) >= 32;

  return NextResponse.json({
    ok: true,
    env: {
      mongodbConfigured: hasMongo,
      jwtConfigured: hasJwt,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    },
  });
}
