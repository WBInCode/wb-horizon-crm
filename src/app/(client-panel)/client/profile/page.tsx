"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  User, Mail, Phone, Shield, Calendar, Camera, Trash2, Eye, EyeOff, Lock, Save, Check,
} from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Dyrektor",
  MANAGER: "Manager",
  CARETAKER: "Opiekun",
  SALESPERSON: "Handlowiec",
  CALL_CENTER: "Call Center",
  CLIENT: "Klient",
  KONTRAHENT: "Kontrahent",
}

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
}

export default function ClientProfilePage() {
  const { update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Form fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/client/profile")
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name)
        setPhone(data.phone || "")
      }
    } catch {
      toast.error("Błąd ładowania profilu")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Imię i nazwisko jest wymagane")
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Nowe hasła nie są identyczne")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = { name: name.trim(), phone: phone.trim() }
      if (newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }

      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setShowPasswordSection(false)
        toast.success("Profil zaktualizowany")
        // Update session to reflect new name
        await updateSession({ name: updated.name })
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zapisu")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Dozwolone formaty: JPG, PNG, WebP, GIF")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksymalny rozmiar pliku to 5 MB")
      return
    }

    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append("avatar", file)

      const res = await fetch("/api/client/profile/avatar", { method: "POST", body: fd })
      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev)
        toast.success("Zdjęcie profilowe zaktualizowane")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd przesyłania")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleAvatarDelete = async () => {
    if (!profile?.avatarUrl) return
    setUploadingAvatar(true)
    try {
      const res = await fetch("/api/client/profile/avatar", { method: "DELETE" })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, avatarUrl: null } : prev)
        toast.success("Zdjęcie usunięte")
      }
    } catch {
      toast.error("Błąd usuwania")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  const hasChanges = profile && (
    name !== profile.name ||
    phone !== (profile.phone || "") ||
    newPassword.length > 0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--content-muted)" }}>
        Nie udało się załadować profilu
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
          Mój profil
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--content-muted)" }}>
          Zarządzaj swoimi danymi konta i zdjęciem profilowym
        </p>
      </div>

      {/* Avatar section */}
      <div className="p-5 rounded-xl" style={{ background: "var(--surface-0)", border: "1px solid var(--line-subtle)" }}>
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative group">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: profile.avatarUrl ? "transparent" : "var(--brand-muted)",
                boxShadow: "0 0 0 2px var(--surface-0), 0 0 0 4px var(--brand)",
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}>
                  {initials}
                </span>
              )}
            </div>

            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              {uploadingAvatar ? (
                <div className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full border-white" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold" style={{ color: "var(--content-strong)" }}>
              Zdjęcie profilowe
            </h3>
            <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--content-muted)" }}>
              JPG, PNG, WebP lub GIF · maks. 5 MB
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                {profile.avatarUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
              </Button>
              {profile.avatarUrl && (
                <Button size="sm" variant="outline" onClick={handleAvatarDelete} disabled={uploadingAvatar}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Usuń
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="p-5 rounded-xl space-y-4" style={{ background: "var(--surface-0)", border: "1px solid var(--line-subtle)" }}>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--content-strong)" }}>
          <User className="w-4 h-4" style={{ color: "var(--brand)" }} />
          Dane osobowe
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--content-muted)" }}>
              Imię i nazwisko *
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jan Kowalski"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--content-muted)" }}>
              <Mail className="w-3 h-3" /> E-mail
            </label>
            <Input
              value={profile.email}
              disabled
              className="opacity-60"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--content-muted)" }}>
              <Phone className="w-3 h-3" /> Telefon
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--content-muted)" }}>
              <Shield className="w-3 h-3" /> Rola
            </label>
            <div
              className="h-9 px-3 flex items-center rounded-md text-sm"
              style={{ background: "var(--surface-2)", color: "var(--content-default)", border: "1px solid var(--line-subtle)" }}
            >
              {ROLE_LABELS[profile.role] || profile.role}
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="flex flex-wrap gap-4 pt-2" style={{ borderTop: "1px solid var(--line-subtle)" }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--content-muted)" }}>
            <Calendar className="w-3 h-3" />
            Konto od: {new Date(profile.createdAt).toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" })}
          </div>
          {profile.lastLoginAt && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--content-muted)" }}>
              <Check className="w-3 h-3" />
              Ostatnie logowanie: {new Date(profile.lastLoginAt).toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Password section */}
      <div className="p-5 rounded-xl space-y-4" style={{ background: "var(--surface-0)", border: "1px solid var(--line-subtle)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--content-strong)" }}>
            <Lock className="w-4 h-4" style={{ color: "var(--brand)" }} />
            Zmiana hasła
          </h3>
          {!showPasswordSection && (
            <Button size="sm" variant="outline" onClick={() => setShowPasswordSection(true)}>
              Zmień hasło
            </Button>
          )}
        </div>

        {showPasswordSection && (
          <div className="space-y-3">
            {/* Current password */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--content-muted)" }}>
                Aktualne hasło *
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Wpisz aktualne hasło"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: "var(--content-muted)" }}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--content-muted)" }}>
                Nowe hasło * <span className="font-normal">(min. 6 znaków)</span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nowe hasło"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: "var(--content-muted)" }}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--content-muted)" }}>
                Powtórz nowe hasło *
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Powtórz nowe hasło"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>Hasła nie są identyczne</p>
              )}
            </div>

            <Button
              size="sm" variant="outline"
              onClick={() => { setShowPasswordSection(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("") }}
            >
              Anuluj zmianę hasła
            </Button>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !hasChanges} className="min-w-[140px]">
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full border-white mr-2" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" /> Zapisz zmiany
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
