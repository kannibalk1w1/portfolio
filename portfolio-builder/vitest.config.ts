import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'main',
          environment: 'node',
          globals: true,
          include: ['tests/main/**/*.test.ts']
        }
      },
      {
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['tests/renderer/setup.ts'],
          include: ['tests/renderer/**/*.test.tsx']
        }
      }
    ]
  }
})
