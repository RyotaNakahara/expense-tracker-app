import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Reactのact警告を抑制（@testing-library/user-eventが既にactを使用しているため）
    onConsoleLog(log, type) {
      if (
        type === 'warn' &&
        log.includes('An update to') &&
        log.includes('inside a test was not wrapped in act')
      ) {
        return false // この警告を抑制
      }
      if (
        type === 'warn' &&
        log.includes('React Router Future Flag Warning')
      ) {
        return false // React Routerの警告を抑制
      }
    },
  },
})
