import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

vi.mock('heic-convert', () => ({
  default: vi.fn(async () => Buffer.from('jpeg-from-heic'))
}))

vi.mock('sharp', () => {
  const toFile = vi.fn(async (path: string) => {
    writeFileSync(path, Buffer.from('jpeg-from-tiff'))
    return { format: 'jpeg' }
  })
  const jpeg = vi.fn(() => ({ toFile }))
  const sharpFn = vi.fn(() => ({ jpeg }))
  return { default: sharpFn }
})

vi.mock('assimpjs', () => {
  const result = {
    IsSuccess: () => true,
    FileCount: () => 1,
    GetFile: () => ({
      GetPath: () => 'scene.glb',
      GetContent: () => new Uint8Array(Buffer.from('glb-from-assimp'))
    })
  }
  const FileList = vi.fn(() => ({ AddFile: vi.fn() }))
  const ConvertFileList = vi.fn(() => result)
  return { default: () => Promise.resolve({ FileList, ConvertFileList }) }
})

import { importMediaFiles } from '../../../src/main/media/importer'

const TMP = join(__dirname, '__tmp_importer__')
const SRC = join(TMP, 'src')
const PORTFOLIO = join(TMP, 'portfolio')

beforeEach(() => {
  mkdirSync(SRC, { recursive: true })
  mkdirSync(PORTFOLIO, { recursive: true })
})
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('importMediaFiles', () => {
  it('converts .tif to .jpg on import', async () => {
    const src = join(SRC, 'photo.tif')
    writeFileSync(src, Buffer.from('fake-tiff-bytes'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatch(/\.jpg$/)
    const dest = join(PORTFOLIO, 'assets', result[0])
    expect(existsSync(dest)).toBe(true)
    expect(readFileSync(dest).toString()).toBe('jpeg-from-tiff')
  })

  it('converts .tiff to .jpg on import', async () => {
    const src = join(SRC, 'scan.tiff')
    writeFileSync(src, Buffer.from('fake-tiff-bytes'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.jpg$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('jpeg-from-tiff')
  })

  it('converts .heic to .jpg on import', async () => {
    const src = join(SRC, 'photo.heic')
    writeFileSync(src, Buffer.from('fake-heic-bytes'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.jpg$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('jpeg-from-heic')
  })

  it('converts .heif to .jpg on import', async () => {
    const src = join(SRC, 'photo.heif')
    writeFileSync(src, Buffer.from('fake-heif-bytes'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.jpg$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('jpeg-from-heic')
  })

  it('copies .jpg through unchanged', async () => {
    const src = join(SRC, 'photo.jpg')
    writeFileSync(src, Buffer.from('original-jpeg'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.jpg$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('original-jpeg')
  })

  it('copies .avif through unchanged', async () => {
    const src = join(SRC, 'photo.avif')
    writeFileSync(src, Buffer.from('original-avif'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.avif$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('original-avif')
  })

  it('copies .mov through unchanged', async () => {
    const src = join(SRC, 'clip.mov')
    writeFileSync(src, Buffer.from('original-mov'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.mov$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('original-mov')
  })

  it.each(['fbx', 'stl', '3ds', 'obj', 'ply'])(
    'converts .%s to .glb on import',
    async (ext) => {
      const src = join(SRC, `model.${ext}`)
      writeFileSync(src, Buffer.from(`fake-${ext}-bytes`))

      const result = await importMediaFiles(PORTFOLIO, [src])

      expect(result[0]).toMatch(/\.glb$/)
      expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString())
        .toBe('glb-from-assimp')
    }
  )

  it('copies .glb through unchanged', async () => {
    const src = join(SRC, 'model.glb')
    writeFileSync(src, Buffer.from('original-glb'))

    const result = await importMediaFiles(PORTFOLIO, [src])

    expect(result[0]).toMatch(/\.glb$/)
    expect(readFileSync(join(PORTFOLIO, 'assets', result[0])).toString()).toBe('original-glb')
  })
})
