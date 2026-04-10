"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, Check, X, AlertTriangle, Trash2 } from "lucide-react"

interface Props {
  caseId: string
  files: any[]
  onUpdate: () => void
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  MISSING: "bg-orange-100 text-orange-800",
}

const statusLabels: Record<string, string> = {
  PENDING: "Oczekuje",
  APPROVED: "Zaakceptowany",
  REJECTED: "Odrzucony",
  MISSING: "Brakujący",
}

export function FilesTab({ caseId, files, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      await fetch(`/api/cases/${caseId}/files`, {
        method: "POST",
        body: formData
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd uploadu:", error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleStatusChange = async (fileId: string, status: string) => {
    try {
      await fetch(`/api/cases/${caseId}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm("Czy na pewno usunąć plik?")) return

    try {
      await fetch(`/api/cases/${caseId}/files/${fileId}`, {
        method: "DELETE"
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pliki ({files?.length || 0})</CardTitle>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Wysyłanie..." : "Dodaj plik"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!Array.isArray(files) || files.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Brak plików</p>
        ) : (
          <div className="space-y-2">
            {files.map((file: any) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{file.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {file.uploadedBy?.name} • {new Date(file.createdAt).toLocaleDateString("pl-PL")}
                      {file.fileSize && ` • ${(file.fileSize / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={statusColors[file.status]}>
                    {statusLabels[file.status]}
                  </Badge>

                  <a href={file.filePath} download>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleStatusChange(file.id, "APPROVED")}
                    className="text-green-600"
                    title="Akceptuj"
                  >
                    <Check className="w-4 h-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleStatusChange(file.id, "REJECTED")}
                    className="text-red-600"
                    title="Odrzuć"
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleStatusChange(file.id, "MISSING")}
                    className="text-orange-600"
                    title="Oznacz jako brakujący"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    title="Usuń"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
