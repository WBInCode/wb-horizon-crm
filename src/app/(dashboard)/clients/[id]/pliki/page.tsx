"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FolderOpen, Upload, CheckCircle2, XCircle, File } from "lucide-react"
import ProductSwitcher from "@/components/contractors/ProductSwitcher"

const FILE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekuje",
  APPROVED: "Zatwierdzony",
  REJECTED: "Odrzucony",
  MISSING: "Brak",
}

const FILE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  MISSING: "bg-zinc-100 text-zinc-500",
}

export default function ClientPlikiPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("productId")

  const [products, setProducts] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [fileGroups, setFileGroups] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/clients/${id}/products`).then((r) => r.json()),
      fetch(`/api/cases?clientId=${id}`).then((r) => r.json()),
    ])
      .then(([prods, casesData]) => {
        setProducts(Array.isArray(prods) ? prods : [])
        setCases(Array.isArray(casesData) ? casesData : casesData?.cases || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const selectedProductId = productId || products[0]?.id
  const activeCase = cases.find(
    (c: any) => c.productId === selectedProductId && !["CLOSED", "CANCELLED"].includes(c.status)
  )

  // Fetch file groups for the product
  useEffect(() => {
    if (!selectedProductId) { setFileGroups([]); return }
    fetch(`/api/products/${selectedProductId}/file-groups`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFileGroups(Array.isArray(data) ? data : []))
      .catch(() => setFileGroups([]))
  }, [selectedProductId])

  // Fetch files for the case
  useEffect(() => {
    if (!activeCase?.id) { setFiles([]); return }
    fetch(`/api/cases/${activeCase.id}/files`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(() => setFiles([]))
  }, [activeCase?.id])

  if (loading) return <div className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  // Group files by groupId
  const filesByGroup = (groupId: string | null) =>
    files.filter((f: any) => f.groupId === groupId)

  return (
    <div className="space-y-4">
      <ProductSwitcher
        products={products}
        selectedProductId={selectedProductId}
        onSelect={(pid) => router.push(`/clients/${id}/pliki?productId=${pid}`)}
      />

      {!activeCase && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak aktywnej sprzedaży dla wybranego produktu.
          </CardContent>
        </Card>
      )}

      {activeCase && (
        <>
          {fileGroups.length > 0 ? (
            fileGroups.map((group: any) => {
              const groupFiles = filesByGroup(group.id)
              return (
                <Card key={group.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        {group.name}
                        {group.isRequired && <Badge variant="destructive" className="text-[9px]">wymagana</Badge>}
                      </CardTitle>
                      <span className="text-xs" style={{ color: "var(--content-muted)" }}>
                        {groupFiles.length} plików
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-xs mt-1" style={{ color: "var(--content-muted)" }}>{group.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {groupFiles.length === 0 ? (
                      <p className="text-xs py-2" style={{ color: "var(--content-muted)" }}>Brak plików w tej grupie</p>
                    ) : (
                      <div className="space-y-1">
                        {groupFiles.map((f: any) => (
                          <FileRow key={f.id} file={f} caseId={activeCase.id} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : null}

          {/* Ungrouped files */}
          {filesByGroup(null).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <File className="w-4 h-4" /> Pozostałe pliki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {filesByGroup(null).map((f: any) => (
                    <FileRow key={f.id} file={f} caseId={activeCase.id} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {files.length === 0 && fileGroups.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
                Brak zdefiniowanych grup plików i przesłanych dokumentów.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function FileRow({ file, caseId }: { file: any; caseId: string }) {
  return (
    <div
      className="flex items-center gap-3 py-2 text-sm"
      style={{ borderBottom: "1px solid var(--line-subtle)" }}
    >
      <File className="w-4 h-4 flex-shrink-0" style={{ color: "var(--content-subtle)" }} />
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ color: "var(--content-default)" }}>{file.fileName}</p>
        <p className="text-xs" style={{ color: "var(--content-muted)" }}>
          {file.uploadedBy?.name || "—"} · {new Date(file.createdAt).toLocaleDateString("pl-PL")}
        </p>
      </div>
      <Badge className={FILE_STATUS_COLORS[file.status] || ""} >
        {FILE_STATUS_LABELS[file.status] || file.status}
      </Badge>
      {file.fileUrl && (
        <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-xs hover:underline" style={{ color: "var(--brand)" }}>
          Pobierz
        </a>
      )}
    </div>
  )
}
