import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { put, del } from "@vercel/blob"
import { assertSafeUpload } from "@/lib/file-safety"

// POST — upload avatar image
export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, avatarUrl: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get("avatar") as File

  if (!file) {
    return NextResponse.json({ error: "Brak pliku" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Dozwolone formaty: JPG, PNG, WebP, GIF" }, { status: 400 })
  }

  // Validate file size (max 5MB) + magic bytes + sanitacja nazwy
  const validation = await assertSafeUpload(file, { maxBytes: 5 * 1024 * 1024 })
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  if (!validation.detectedMime?.startsWith("image/")) {
    return NextResponse.json({ error: "Plik nie jest prawidłowym obrazem." }, { status: 400 })
  }
  const safeName = validation.safeName

  // Delete old avatar if exists
  if (user.avatarUrl) {
    try {
      await del(user.avatarUrl)
    } catch {
      // Ignore deletion errors for old avatars
    }
  }

  // Upload new avatar
  const blob = await put(`avatars/${user.id}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  })

  // Update user with new avatar URL
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: blob.url },
    select: { avatarUrl: true },
  })

  return NextResponse.json({ avatarUrl: updated.avatarUrl })
}

// DELETE — remove avatar
export async function DELETE() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, avatarUrl: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 })
  }

  if (user.avatarUrl) {
    try {
      await del(user.avatarUrl)
    } catch {
      // Ignore deletion errors
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  })

  return NextResponse.json({ success: true })
}
