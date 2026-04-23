import { NextResponse } from "next/server"
import { getCurrentUser, getUserPermissions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const permissions = await getUserPermissions(user.id)

  // Also get role template info
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      roleTemplate: {
        select: { id: true, name: true, label: true, color: true }
      }
    }
  })

  return NextResponse.json({
    permissions,
    roleTemplate: dbUser?.roleTemplate ?? null,
  })
}
