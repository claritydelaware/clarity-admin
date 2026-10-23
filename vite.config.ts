import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handle } from './demo/mock-api.mjs'

// `npm run dev:demo` — serves synthetic data from demo/mock-api.mjs instead of
// proxying to the live Worker. Nothing leaves the machine; writes only touch
// in-memory demo data and reset when the dev server restarts.
function demoApi(): Plugin {
  return {
    name: 'clarity-demo-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const chunks: Buffer[] = []
        req.on('data', c => chunks.push(c))
        req.on('end', () => {
          let body: unknown = {}
          try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {} } catch { /* non-JSON body */ }
          const result = handle(req.method ?? 'GET', '/api' + url.pathname, url.searchParams, body)
          res.setHeader('Content-Type', 'application/json')
          if (result === undefined) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'No demo data for ' + url.pathname }))
          } else {
            res.end(JSON.stringify(result))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    react(),
    ...(mode === 'demo' ? [demoApi()] : []),
  ],
  assetsInclude: ['**/*.xlsx'],
  server: mode === 'demo' ? {} : {
    proxy: {
      '/api': {
        target: 'https://clarity-admin-api.bruce-5f2.workers.dev',
        changeOrigin: true,
      },
    },
  },
}))
