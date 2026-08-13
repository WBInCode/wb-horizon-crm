/**
 * Hak startowy Next.js — wolany raz przy starcie serwera.
 *
 * Tu wstaje harmonogram zadan. Nie w trasie i nie w komponencie, bo tamte
 * wykonuja sie przy zapytaniach, a zadania maja chodzic niezaleznie od ruchu.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { uruchomHarmonogram } = await import("@/lib/harmonogram")
  uruchomHarmonogram()
}
