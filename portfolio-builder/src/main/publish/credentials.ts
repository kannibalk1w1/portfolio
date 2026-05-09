import { app, safeStorage } from 'electron'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

function credentialsDir(): string {
  return join(app.getPath('userData'), 'credentials')
}

function safeSlug(slug: string): string {
  return slug.replace(/[^A-Za-z0-9_-]/g, '_')
}

function ftpFilePath(slug: string): string {
  return join(credentialsDir(), `ftp-${safeSlug(slug)}.bin`)
}

function ensureEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Secure storage is not available on this system. ' +
        'On Linux, install libsecret / gnome-keyring; on Windows, DPAPI should always be available.',
    )
  }
}

export async function setFtpPassword(slug: string, password: string): Promise<void> {
  ensureEncryptionAvailable()
  await mkdir(credentialsDir(), { recursive: true })
  const encrypted = safeStorage.encryptString(password)
  await writeFile(ftpFilePath(slug), encrypted)
}

export async function getFtpPassword(slug: string): Promise<string | null> {
  const path = ftpFilePath(slug)
  if (!existsSync(path)) return null
  ensureEncryptionAvailable()
  const buf = await readFile(path)
  return safeStorage.decryptString(buf)
}

export async function hasFtpPassword(slug: string): Promise<boolean> {
  return existsSync(ftpFilePath(slug))
}

export async function deleteFtpPassword(slug: string): Promise<void> {
  const path = ftpFilePath(slug)
  if (existsSync(path)) await unlink(path)
}
