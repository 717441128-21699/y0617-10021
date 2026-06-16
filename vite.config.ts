import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [react()],
    ...(isLib
      ? {
          build: {
            lib: {
              entry: './src/index.tsx',
              name: 'ChatWidget',
              formats: ['iife'] as const,
              fileName: () => 'chat-widget.js',
            },
            rollupOptions: {
              output: {
                extend: true,
              },
            },
          },
        }
      : {}),
  }
})
