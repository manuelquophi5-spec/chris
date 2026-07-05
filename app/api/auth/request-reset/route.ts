import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { User } from "@/models/User";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    await connectDB();

    const doc = await User.findById(user.id);
    if (!doc) return jsonError("User not found", 404);

    // Clear the password so student can use Set Password again
    doc.passwordHash = undefined;
    doc.passwordMustChange = true;
    doc.failedLoginAttempts = 0;
    doc.lockedUntil = null;
    await doc.save();

    return jsonOk({
      message: "Password has been reset. Use the Set Password page with your Student ID to create a new one.",
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/auth/request-reset]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
