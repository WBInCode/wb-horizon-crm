/**
 * Bezpieczna obróbka uploadów plików.
 *
 * - `safeFileName` — usuwa path traversal, przycina długość, zachowuje rozszerzenie.
 * - `detectMagicMime` — sprawdza pierwsze bajty pliku (magic bytes) zamiast ufać MIME klienta.
 * - `assertSafeUpload` — łączy walidację rozmiaru, MIME deklarowanego i magic bytes.
 */

const ALLOWED_EXT = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods",
  "txt", "csv", "json",
  "jpg", "jpeg", "png", "gif", "webp", "avif", "svg",
  "zip", "7z", "rar",
  "mp4", "mov", "webm",
  "mp3", "wav",
])

const MAX_NAME_LEN = 120

/** Zamień nazwę pliku na bezpieczny slug zachowujący rozszerzenie. */
export function safeFileName(input: string): string {
  // wyłuskaj tylko basename (anti path-traversal)
  const cleaned = input.replace(/[\\/]/g, "_").replace(/^\.+/, "")
  const lastDot = cleaned.lastIndexOf(".")
  const base = lastDot > 0 ? cleaned.slice(0, lastDot) : cleaned
  const ext = lastDot > 0 ? cleaned.slice(lastDot + 1).toLowerCase() : ""

  const slug = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, MAX_NAME_LEN) || "file"

  const safeExt = ext && /^[a-z0-9]{1,8}$/.test(ext) ? ext : ""
  return safeExt ? `${slug}.${safeExt}` : slug
}

export function isAllowedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? ""
  return ALLOWED_EXT.has(ext)
}

/**
 * Rozpoznaj typ pliku po pierwszych bajtach (magic numbers).
 * Zwraca rozpoznany MIME lub `null` jeśli nieznany.
 */
export function detectMagicMime(bytes: Uint8Array): string | null {
  const b = bytes
  // PDF
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf"
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png"
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif"
  // WEBP (RIFF....WEBP)
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp"
  // ZIP (also docx/xlsx/pptx/odt/ods)
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return "application/zip"
  // 7z
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return "application/x-7z-compressed"
  // RAR
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return "application/vnd.rar"
  // MP4 (ftyp at offset 4)
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "video/mp4"
  // MS Office (legacy doc/xls/ppt) — D0 CF 11 E0 A1 B1 1A E1
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "application/x-ole-storage"
  return null
}

export interface UploadValidationOk {
  ok: true
  safeName: string
  detectedMime: string | null
}
export interface UploadValidationErr {
  ok: false
  error: string
}
export type UploadValidation = UploadValidationOk | UploadValidationErr

const DOCX_OK = new Set([
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
])

/**
 * Główny walidator do użycia w handlerach POST /api/.../files.
 * Sprawdza rozszerzenie, rozmiar, magic bytes (tolerancyjnie dla zip-bazowych formatów).
 */
export async function assertSafeUpload(
  file: File,
  opts: { maxBytes: number },
): Promise<UploadValidation> {
  if (file.size === 0) return { ok: false, error: "Plik jest pusty." }
  if (file.size > opts.maxBytes) {
    return { ok: false, error: `Plik przekracza maksymalny rozmiar ${Math.round(opts.maxBytes / 1024 / 1024)} MB.` }
  }
  const safeName = safeFileName(file.name)
  if (!isAllowedExtension(safeName)) {
    return { ok: false, error: "Niedozwolony typ pliku." }
  }
  // magic byte check
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const detected = detectMagicMime(head)

  // jeśli klient zadeklarował obraz, magic musi się zgadzać
  if (file.type.startsWith("image/") && (!detected || !detected.startsWith("image/"))) {
    return { ok: false, error: "Plik nie jest prawidłowym obrazem." }
  }
  // PDF
  if (file.type === "application/pdf" && detected !== "application/pdf") {
    return { ok: false, error: "Plik nie jest prawidłowym PDF." }
  }
  // Office formats — wszystkie nowoczesne to ZIP w środku
  const ext = safeName.split(".").pop()!
  if (["docx", "xlsx", "pptx", "odt", "ods"].includes(ext)) {
    if (!detected || !DOCX_OK.has(detected)) {
      return { ok: false, error: "Plik nie jest prawidłowym dokumentem Office/OpenDocument." }
    }
  }

  return { ok: true, safeName, detectedMime: detected }
}
