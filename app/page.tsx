import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getServerSession();
  redirect(user ? "/dashboard" : "/login");
}
