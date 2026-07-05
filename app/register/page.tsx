import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/set-password?from=register");
}
