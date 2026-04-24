"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package } from "lucide-react"

interface ProductSwitcherProps {
  products: any[]
  selectedProductId: string | null
  onSelect: (productId: string) => void
}

export default function ProductSwitcher({ products, selectedProductId, onSelect }: ProductSwitcherProps) {
  if (!products.length) return null

  return (
    <div className="flex items-center gap-2">
      <Package className="w-4 h-4" style={{ color: "var(--content-subtle)" }} />
      <Select value={selectedProductId || ""} onValueChange={onSelect}>
        <SelectTrigger className="w-64 h-8 text-xs">
          <SelectValue placeholder="Wybierz produkt..." />
        </SelectTrigger>
        <SelectContent>
          {products.map((p: any) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} {p.lifecycleStatus === "DRAFT" ? "(roboczy)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
