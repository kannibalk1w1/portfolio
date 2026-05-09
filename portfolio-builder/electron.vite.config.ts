import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // @ts-ignore vitest config — not in electron-vite types
    test: {
      environment: 'node',
      globals: true,
      include: ['tests/main/**/*.test.ts']
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    // @ts-ignore vitest config — not in electron-vite types
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['tests/renderer/setup.ts'],
      include: ['tests/renderer/**/*.test.tsx']
    }
  }
})
