import { defineConfig } from 'vitest/config'

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
