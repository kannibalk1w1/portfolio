import { cp, mkdir, readFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { randomUUID } from 'crypto'

const HEIC_EXTS = new Set(['.heic', '.heif'])

async function convertHeic(srcPath: string, destPath: string): Promise<void> {
  const heicConvert = (await import('heic-convert')).default
  const { readFile: rf, writeFile } = await import('fs/promises')
  const input = await rf(srcPath)
  const output = await heicConvert({
    buffer: input as unknown as ArrayBuffer,
    format: 'JPEG',
    quality: 0.92
  })
  await writeFile(destPath, Buffer.from(output as ArrayBuffer))
}

async function copyGltfCompanions(gltfSrcPath: string, assetsDir: string): Promise<void> {
  try {
    const raw = await readFile(gltfSrcPath, 'utf-8')
    const gltf = JSON.parse(raw)
    const srcDir = dirname(gltfSrcPath)
    const refs = new Set<string>()

    // Collect all external URI references
    for (const buf of gltf.buffers ?? []) {
      if (buf.uri && !buf.uri.startsWith('data:')) refs.add(buf.uri)
    }
    for (const img of gltf.images ?? []) {
      if (img.uri && !img.uri.startsWith('data:')) refs.add(img.uri)
    }

    for (const ref of refs) {
      const srcFile = join(srcDir, ref)
      const destFile = join(assetsDir, basename(ref))
      await cp(srcFile, destFile).catch(() => {
        // Companion file not found — skip rather than crash
        console.warn(`GLTF companion not found: ${srcFile}`)
      })
    }
  } catch {
    // Not valid JSON or unreadable — skip companion copy
  }
}

export async function importMediaFiles(portfolioDir: string, filePaths: string[]): Promise<string[]> {
  const assetsDir = join(portfolioDir, 'assets')
  await mkdir(assetsDir, { recursive: true })
  const results: string[] = []
  for (const src of filePaths) {
    const ext = extname(src).toLowerCase()
    const base = basename(src, ext)
    const destExt = HEIC_EXTS.has(ext) ? '.jpg' : ext
    const uniqueName = `${base}-${randomUUID().slice(0, 8)}${destExt}`
    const dest = join(assetsDir, uniqueName)
    if (HEIC_EXTS.has(ext)) {
      await convertHeic(src, dest)
    } else {
      await cp(src, dest)
    }
    // For GLTF files, copy companion .bin and texture files from the same source directory
    if (ext === '.gltf') {
      await copyGltfCompanions(src, assetsDir)
    }
    results.push(uniqueName)
  }
  return results
}

export async function importGodotFolder(
  portfolioDir: string,
  folderPath: string,
  title: string
): Promise<string> {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const folderName = `godot-${slug}`
  const dest = join(portfolioDir, 'assets', folderName)
  await mkdir(join(portfolioDir, 'assets'), { recursive: true })
  await cp(folderPath, dest, { recursive: true })
  return folderName
}
