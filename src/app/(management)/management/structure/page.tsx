"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ChevronRight } from "lucide-react"

export default function StructurePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/management/structure")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} /></div>

  if (!data?.structure) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold mb-4" style={{ color: "var(--content-strong)" }}>Moja struktura</h1>
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Nie przypisano do żadnej struktury</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Moja struktura — {data.structure.name}</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Dyrektor</CardTitle></CardHeader>
        <CardContent>
          <MemberCard user={data.structure.director} role="DIRECTOR" />
        </CardContent>
      </Card>

      {data.tree.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Członkowie</CardTitle></CardHeader>
          <CardContent>
            {data.tree.map((node: any) => <TreeNode key={node.id} node={node} depth={0} />)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TreeNode({ node, depth }: { node: any; depth: number }) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <MemberCard user={node.user} role={node.roleInStructure} />
      {node.children?.map((child: any) => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  )
}

const roleLabels: Record<string, string> = {
  DIRECTOR: "Dyrektor", MANAGER: "Manager", CARETAKER: "Opiekun", SALESPERSON: "Handlowiec", CALL_CENTER: "Call Center",
}

function MemberCard({ user, role }: { user: any; role: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
      <div className="flex items-center gap-2">
        <ChevronRight className="w-3 h-3" style={{ color: "var(--content-subtle)" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{user.name}</p>
          <p className="text-xs" style={{ color: "var(--content-muted)" }}>{user.email}</p>
        </div>
      </div>
      <Badge variant="outline">{roleLabels[role] || role}</Badge>
    </div>
  )
}
