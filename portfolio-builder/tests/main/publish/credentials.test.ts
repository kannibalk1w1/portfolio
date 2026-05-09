import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const TMP = join(__dirname, '__tmp_credentials__')

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return TMP
      throw new Error(`Unexpected getPath: ${name}`)
    },
  },
  // XOR-with-0xFF stand-in for safeStorage so we can assert that the on-disk
  // file does not contain the plaintext password.
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => {
      const buf = Buffer.from(s, 'utf-8')
      const out = Buffer.alloc(buf.length)
      for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ 0xff
      return out
    },
    decryptString: (buf: Buffer) => {
      const out = Buffer.alloc(buf.length)
      for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ 0xff
      return out.toString('utf-8')
    },
  },
}))

import {
  setFtpPassword,
  getFtpPassword,
  hasFtpPassword,
  deleteFtpPassword,
} from '../../../src/main/publish/credentials'

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('credentials', () => {
  it('returns null when no password is stored', async () => {
    expect(await getFtpPassword('alice')).toBeNull()
    expect(await hasFtpPassword('alice')).toBe(false)
  })

  it('stores and retrieves a password', async () => {
    await setFtpPassword('alice', 'hunter2')
    expect(await hasFtpPassword('alice')).toBe(true)
    expect(await getFtpPassword('alice')).toBe('hunter2')
  })

  it('overwrites an existing password', async () => {
    await setFtpPassword('alice', 'old-pass')
    await setFtpPassword('alice', 'new-pass')
    expect(await getFtpPassword('alice')).toBe('new-pass')
  })

  it('deletes a stored password', async () => {
    await setFtpPassword('alice', 'hunter2')
    await deleteFtpPassword('alice')
    expect(await hasFtpPassword('alice')).toBe(false)
    expect(await getFtpPassword('alice')).toBeNull()
  })

  it('deleting a non-existent password is a no-op', async () => {
    await expect(deleteFtpPassword('nope')).resolves.toBeUndefined()
  })

  it('keeps passwords separate per slug', async () => {
    await setFtpPassword('alice', 'apass')
    await setFtpPassword('bob', 'bpass')
    expect(await getFtpPassword('alice')).toBe('apass')
    expect(await getFtpPassword('bob')).toBe('bpass')
  })

  it('persists encrypted, not as plaintext', async () => {
    await setFtpPassword('alice', 'super_secret_phrase')
    const path = join(TMP, 'credentials', 'ftp-alice.bin')
    expect(existsSync(path)).toBe(true)
    const raw = readFileSync(path).toString('binary')
    expect(raw).not.toContain('super_secret_phrase')
  })

  it('refuses to write outside the credentials directory when slug contains path separators', async () => {
    await setFtpPassword('../etc/passwd', 'pwn')
    // The escape attempt must not have created a file outside TMP/credentials/
    expect(existsSync(join(TMP, 'etc', 'passwd'))).toBe(false)
    // And the password is still recoverable under the sanitized slug
    expect(await getFtpPassword('../etc/passwd')).toBe('pwn')
  })
})
