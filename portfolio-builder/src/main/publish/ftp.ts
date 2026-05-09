import { Client } from 'basic-ftp'
import { join } from 'path'
import type { FtpConfig } from '../../renderer/src/types/portfolio'

export async function uploadFtp(portfolioDir: string, config: FtpConfig): Promise<void> {
  const client = new Client()
  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.user,
      secure: config.secure,
    })
    await client.ensureDir(config.remotePath)
    await client.clearWorkingDir()
    await client.uploadFromDir(join(portfolioDir, 'output'), config.remotePath)
  } finally {
    client.close()
  }
}
