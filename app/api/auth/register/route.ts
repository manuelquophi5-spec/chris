import { jsonError } from "@/lib/api";

/** Public self-registration is disabled; admins create accounts. */
export async function POST() {
  return jsonError(
    "Registration is closed. Ask your administrator for a student ID, then set your password.",
    403,
  );
}
