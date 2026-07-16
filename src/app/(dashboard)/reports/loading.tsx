export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1200px] mx-auto space-y-6" role="status" aria-label="Ładowanie raportów">
      <div className="skeleton h-8 w-40 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
      </div>
    </div>
  )
}
