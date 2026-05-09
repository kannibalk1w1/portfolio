import { Client } from 'basic-ftp'
import { join } from 'path'
import type { FtpConfig } from '../../renderer/src/types/portfolio'

export async function uploadFtp(portfolioDir: string, config: FtpConfig): Promise<void> {
  if (!config.password) {
    console.warn('FTP: no password configured — connection may fail for authenticated servers')
  }
  const client = new Client(15000)  // 15s timeout
  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.user,
      password: config.password ?? '',
      secure: config.secure,
    })
    await client.ensureDir(config.remotePath)
    await client.clearWorkingDir()
    await client.uploadFromDir(join(portfolioDir, 'output'), config.remotePath)
  } finally {
    client.close()
  }
}
