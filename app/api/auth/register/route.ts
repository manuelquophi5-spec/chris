import { jsonError } from "@/lib/api";

/** Public self-registration is disabled; admins create accounts. */
export async function POST() {
  return jsonError(
    "Registration is closed. Ask your administrator for an employee ID, then set your password.",
    403,
  );
}
