import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { checkRateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return jsonError("Current and new password are required");
    }
    const policyError = validatePassword(newPassword);
    if (policyError) return jsonError(policyError);

    // A stolen session must not be able to guess the current password unchecked.
    const limited = await checkRateLimit(`change-password:${user.id}`, 5);
    if (!limited.allowed) {
      return jsonError(
        `Too many attempts. Try again in ${limited.retryAfterSec ?? 60} seconds.`,
        429,
      );
    }

    await connectDB();

    const doc = await User.findById(user.id).select("+passwordHash");
    if (!doc) return jsonError("User not found", 404);
    if (!doc.passwordHash) {
      return jsonError("No password set. Use Set Password first.", 400);
    }

    const valid = await verifyPassword(currentPassword, doc.passwordHash);
    if (!valid) {
      return jsonError("Current password is incorrect");
    }

    doc.passwordHash = await hashPassword(newPassword);
    await doc.save();

    return jsonOk({ message: "Password changed successfully" } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/auth/change-password]", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
