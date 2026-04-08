import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

export default async function Home() {
  const session = await getServerSession()
  const role = (session?.user as any)?.role

  if (role === "CLIENT") {
    redirect("/client")
  }

  if (session) {
    redirect("/dashboard")
  }

  redirect("/login")
}
