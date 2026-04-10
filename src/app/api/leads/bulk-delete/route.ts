import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Brak wybranych elementów" }, { status: 400 })
    }

    let deletedCount = 0

    for (const id of ids) {
      const lead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, companyName: true, convertedToClientId: true },
      })

      if (!lead) continue

      // Don't delete leads that were converted to clients
      if (lead.convertedToClientId) continue

      await prisma.lead.delete({ where: { id } })

      await auditLog({
        action: "DELETE",
        entityType: "LEAD",
        entityId: id,
        entityLabel: lead.companyName,
        userId: user.id,
        metadata: { action: "bulk_delete" },
      })

      deletedCount++
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Usunięto ${deletedCount} leadów`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
