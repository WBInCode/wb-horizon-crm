export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Decorative left panel */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "var(--sidebar)" }}
      >
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--brand)", color: "var(--surface-0)" }}
            >
              <span className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>W</span>
            </div>
            <span
              className="text-base font-semibold tracking-tight"
              style={{ color: "var(--sidebar-accent-foreground)", fontFamily: "var(--font-display)" }}
            >
              WB Horizon
            </span>
          </div>

          <h2
            className="text-4xl font-semibold leading-[1.15] tracking-tight"
            style={{ color: "var(--sidebar-accent-foreground)", fontFamily: "var(--font-display)" }}
          >
            Zarządzaj relacjami
            <br />
            <span style={{ color: "var(--brand)" }}>z&nbsp;inteligencją</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}>
            System CRM nowej generacji. Leady, kontrahenci, sprzedaże — wszystko w jednym miejscu.
          </p>
        </div>

        {/* Bottom decorative element */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "var(--success)", animation: "pulse-ring 2s infinite" }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--success)" }} />
            </span>
            <span className="mono-label" style={{ color: "var(--sidebar-foreground)", opacity: 0.4, fontSize: "0.6rem" }}>
              System aktywny · v2.0
            </span>
          </div>
        </div>

        {/* Abstract geometric decoration */}
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ border: "1px solid var(--sidebar-accent-foreground)" }}
        />
        <div
          className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full opacity-[0.06]"
          style={{ border: "1px solid var(--brand)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {children}
      </div>
    </div>
  )
}
