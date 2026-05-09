import { cp, mkdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { randomUUID } from 'crypto'

const HEIC_EXTS = new Set(['.heic', '.heif'])

async function convertHeic(srcPath: string, destPath: string): Promise<void> {
  const heicConvert = (await import('heic-convert')).default
  const { readFile, writeFile } = await import('fs/promises')
  const input = await readFile(srcPath)
  const output = await heicConvert({
    buffer: input as unknown as ArrayBuffer,
    format: 'JPEG',
    quality: 0.92
  })
  await writeFile(destPath, Buffer.from(output as ArrayBuffer))
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
