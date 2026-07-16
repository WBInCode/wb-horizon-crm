import { createHash, randomBytes } from "node:crypto"

export const API_KEY_PREFIX = "wbh_"
const API_KEY_BYTES = 32

export type ApiKeyScope =
  | "leads:read"
  | "leads:write"
  | "clients:read"
  | "clients:write"
  | "cases:read"
  | "cases:write"
  | "*"

export const ALL_SCOPES: ApiKeyScope[] = [
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
  "cases:read",
  "cases:write",
]

export function generateApiKey(): { plaintext: string; hashed: string; prefix: string } {
  const raw = randomBytes(API_KEY_BYTES).toString("base64url")
  const plaintext = `${API_KEY_PREFIX}${raw}`
  const hashed = hashApiKey(plaintext)
  const prefix = plaintext.slice(0, 12)
  return { plaintext, hashed, prefix }
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex")
}
