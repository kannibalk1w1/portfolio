#!/usr/bin/env node
/**
 * generate-icon.js — creates resources/icon.ico from scratch.
 *
 * Pure Node.js (zlib + fs only, no npm packages).
 * Renders a 256×256 RGBA pixel buffer, encodes it as PNG,
 * then wraps it in an ICO container that electron-builder expects.
 *
 * Run once with:  node generate-icon.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 256

// ---------------------------------------------------------------------------
// Maths helpers
// ---------------------------------------------------------------------------
const lerp   = (a, b, t) => a + (b - a) * t
const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const smooth = (d, w = 2) => clamp(0.5 - d / w, 0, 1)   // antialiased edge

// ---------------------------------------------------------------------------
// Shape SDFs (signed-distance fields)
// ---------------------------------------------------------------------------
function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r
}

function sdBox(px, py, cx, cy, hw, hh, r = 0) {
  const dx = Math.abs(px - cx) - hw + r
  const dy = Math.abs(py - cy) - hh + r
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) +
    Math.min(Math.max(dx, dy), 0) - r
}

// ---------------------------------------------------------------------------
// Pixel renderer
// ---------------------------------------------------------------------------
function renderPixel(x, y) {
  const cx = SIZE / 2, cy = SIZE / 2
  let r = 0, g = 0, b = 0, a = 0

  // ── Background: rounded square, indigo gradient ──────────────────────────
  const bgDist = sdBox(x, y, cx, cy, cx - 20, cy - 20, 44)
  if (bgDist > 2) return [0, 0, 0, 0]  // transparent outside

  const gt = clamp((y + x) / (SIZE * 1.6), 0, 1)
  r = Math.round(lerp(24, 79, gt))
  g = Math.round(lerp(28, 70, gt))
  b = Math.round(lerp(90, 229, gt))
  a = Math.round(255 * smooth(bgDist))

  // ── Rocket body: white rounded pill ──────────────────────────────────────
  // Body spans y=80…178, half-width=28, corner-radius=28
  const bodyDist = sdBox(x, y, cx, 129, 28, 49, 28)
  if (bodyDist < 1.5) {
    const bl = smooth(bodyDist)
    r = Math.round(lerp(r, 242, bl))
    g = Math.round(lerp(g, 242, bl))
    b = Math.round(lerp(b, 248, bl))
  }

  // ── Nose cone: triangle above body ───────────────────────────────────────
  // Tip (cx, 30) → base (cx±28, 82)
  if (y >= 30 && y < 82) {
    const prog    = (y - 30) / 52
    const halfW   = prog * 28
    const edgeDist = halfW - Math.abs(x - cx)
    if (edgeDist > -1.5) {
      const bl = smooth(-edgeDist)
      r = Math.round(lerp(r, 242, bl))
      g = Math.round(lerp(g, 242, bl))
      b = Math.round(lerp(b, 248, bl))
    }
  }

  // ── Fins ─────────────────────────────────────────────────────────────────
  // Left fin: triangle (cx-28,155) → (cx-72,196) → (cx-28,196)
  // Right fin: mirrored
  for (const side of [-1, 1]) {
    const ox  = x - cx          // offset from centre
    const sox = side > 0 ? ox : -ox  // mirrored
    if (sox > 26 && sox < 74 && y > 154 && y < 198) {
      const py   = y - 155
      const prog = py / 41
      const innerX = 28
      const outerX = lerp(28, 72, prog)
      const edgeDist = Math.min(sox - innerX, outerX - sox)
      if (edgeDist > -1.5) {
        const bl = smooth(-edgeDist)
        r = Math.round(lerp(r, 210, bl))
        g = Math.round(lerp(g, 210, bl))
        b = Math.round(lerp(b, 220, bl))
      }
    }
  }

  // ── Porthole ─────────────────────────────────────────────────────────────
  const winDist = sdCircle(x, y, cx, 112, 20)
  if (winDist < 1.5) {
    const bl = smooth(winDist)
    r = Math.round(lerp(r, 125, bl))
    g = Math.round(lerp(g, 193, bl))
    b = Math.round(lerp(b, 254, bl))
  }
  // porthole shine
  const shineDist = sdCircle(x, y, cx - 8, 104, 8)
  if (shineDist < 1) {
    const bl = smooth(shineDist) * 0.65
    r = Math.round(lerp(r, 255, bl))
    g = Math.round(lerp(g, 255, bl))
    b = Math.round(lerp(b, 255, bl))
  }

  // ── Exhaust flame ────────────────────────────────────────────────────────
  const flames = [
    [cx,      196, 26, 249, 115,  22],   // outer orange
    [cx - 12, 204, 14, 253, 211,  60],   // left yellow
    [cx + 12, 204, 14, 253, 211,  60],   // right yellow
    [cx,      210, 10, 255, 255, 180],   // white-hot core
  ]
  for (const [fx, fy, fr, fr2, fg2, fb2] of flames) {
    const fd = sdCircle(x, y, fx, fy, fr)
    if (fd < 1.5) {
      const bl = smooth(fd)
      r = Math.round(lerp(r, fr2, bl))
      g = Math.round(lerp(g, fg2, bl))
      b = Math.round(lerp(b, fb2, bl))
    }
  }

  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), clamp(a, 0, 255)]
}

// ---------------------------------------------------------------------------
// PNG encoder
// ---------------------------------------------------------------------------
function crc32(buf) {
  const tbl = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1)
    tbl[i] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = tbl[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t   = Buffer.from(type)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function encodePNG(rgba, w, h) {
  // Build raw scanlines (filter byte 0 = None prepended to each row)
  const lines = []
  for (let y = 0; y < h; y++) {
    lines.push(0)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      lines.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3])
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(lines), { level: 9 })

  const ihdr = Buffer.from([
    0,0,0,0, 0,0,0,0,   // width / height (filled below)
    8, 6,               // bit depth 8, color type 6 (RGBA)
    0, 0, 0,            // compression, filter, interlace
  ])
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// ICO wrapper (supports PNG-encoded images, Windows Vista+)
// ---------------------------------------------------------------------------
function wrapICO(pngData, size) {
  const header    = Buffer.allocUnsafe(6)
  const dirEntry  = Buffer.allocUnsafe(16)
  const imgOffset = 6 + 16

  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // type: 1 = ICO
  header.writeUInt16LE(1, 4)  // image count

  dirEntry[0] = size === 256 ? 0 : size  // 0 means 256 in ICO format
  dirEntry[1] = size === 256 ? 0 : size
  dirEntry[2] = 0   // colour count (0 = >256 colours)
  dirEntry[3] = 0   // reserved
  dirEntry.writeUInt16LE(1,  4)               // colour planes
  dirEntry.writeUInt16LE(32, 6)               // bits per pixel
  dirEntry.writeUInt32LE(pngData.length, 8)   // size of image data
  dirEntry.writeUInt32LE(imgOffset, 12)       // offset to image data

  return Buffer.concat([header, dirEntry, pngData])
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`Rendering ${SIZE}×${SIZE} icon…`)

const rgba = new Uint8Array(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = renderPixel(x, y)
    const i = (y * SIZE + x) * 4
    rgba[i] = r; rgba[i+1] = g; rgba[i+2] = b; rgba[i+3] = a
  }
}

const png = encodePNG(rgba, SIZE, SIZE)
const ico = wrapICO(png, SIZE)

const outPath = path.join(__dirname, 'resources', 'icon.ico')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, ico)
console.log(`Written: ${outPath}  (${ico.length.toLocaleString()} bytes)`)
