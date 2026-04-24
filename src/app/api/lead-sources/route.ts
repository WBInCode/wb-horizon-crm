import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// PDF A.4.2 — publiczny (dla każdego zalogowanego) lista aktywnych źródeł
// do dropdownów w formularzach Lead/Client/Case.

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 })

  const sources = await prisma.leadSource.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  })
  return NextResponse.json(sources)
}
