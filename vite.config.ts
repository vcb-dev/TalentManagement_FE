import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = (env.VITE_API_URL || 'http://localhost:3003').replace(/\/$/, '')

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/app/routes',
        generatedRouteTree: './src/app/routeTree.gen.ts',
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            // React core (trước đây rơi vào vendor-misc — chiếm phần lớn dung lượng)
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'vendor-react'
            }

            if (id.includes('node_modules/xlsx')) {
              return 'vendor-xlsx'
            }

            if (id.includes('node_modules/@tanstack/')) {
              return 'vendor-tanstack'
            }

            if (id.includes('node_modules/recharts')) {
              return 'vendor-charts'
            }

            if (id.includes('node_modules/@radix-ui/')) {
              return 'vendor-radix'
            }

            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }

            if (id.includes('node_modules/zod')) {
              return 'vendor-zod'
            }

            if (
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/resolvers')
            ) {
              return 'vendor-forms'
            }

            if (id.includes('node_modules/xstate') || id.includes('node_modules/@xstate/')) {
              return 'vendor-xstate'
            }

            if (
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/react-day-picker')
            ) {
              return 'vendor-dates'
            }

            if (
              id.includes('node_modules/axios') ||
              id.includes('node_modules/zustand') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/tailwind-merge')
            ) {
              return 'vendor-client-core'
            }

            return 'vendor-misc'
          },
        },
      },
    },
    server: {
      port: 5173,
      // Ngrok: *.ngrok-free.dev / *.ngrok-free.app (miễn phí); *.ngrok.io
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
      proxy: {
        '/uploads': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
