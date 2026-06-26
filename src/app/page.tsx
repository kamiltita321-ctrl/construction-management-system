import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Check user session
  const session = await getSession();
  
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
