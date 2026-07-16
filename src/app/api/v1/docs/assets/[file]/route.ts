/**
 * GET /api/v1/docs/assets/[file] — self-hostowane assety Swagger UI
 * (z pakietu swagger-ui-dist zamiast CDN unpkg — zgodne z CSP `script-src 'self'`
 * i bez ryzyka supply-chain).
 */

import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

export const runtime = "nodejs"

// Whitelist plików — nic poza tym nie wychodzi z node_modules
const ALLOWED_FILES: Record<string, string> = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "text/javascript; charset=utf-8",
  "swagger-ui-standalone-preset.js": "text/javascript; charset=utf-8",
  "favicon-32x32.png": "image/png",
}

const require = createRequire(import.meta.url)

function assetDir(): string {
  // getAbsoluteFSPath działa też w buildzie standalone
  const pkg = require("swagger-ui-dist")
  return pkg.getAbsoluteFSPath() as string
}

const cache = new Map<string, Buffer>()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  const contentType = ALLOWED_FILES[file]
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body = cache.get(file)
  if (!body) {
    try {
      body = await readFile(path.join(assetDir(), file))
      cache.set(file, body)
    } catch {
      return NextResponse.json({ error: "Asset unavailable" }, { status: 404 })
    }
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, immutable",
    },
  })
}
