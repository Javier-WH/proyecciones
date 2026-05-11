import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv's second argument is the env dir; '' lets Vite resolve it itself.
  const env = loadEnv(mode, '', '')
  const backendPort = env.VITE_BACKEND_PORT || env.PORT || '3000'
  const target = `http://localhost:${backendPort}`
  const wsTarget = `ws://localhost:${backendPort}`

  const httpRoutes = [
    '/login', '/logout', '/config',
    '/teachers', '/teacher',
    '/users', '/user',
    '/pnf', '/pnfs',
    '/subject', '/subjects',
    '/subjectinprofile',
    '/trayectos', '/turnos',
    '/proyeccion', '/proyeccions', '/proyecciones',
    '/profile', '/profileNames',
    '/contractType', '/contractTypes',
    '/simpleData', '/setProyection',
    '/pensum', '/photo',
    '/classroom', '/classrooms', '/classroom-overrides',
    '/schedule', '/schedule-config',
    '/teacher-restrictions', '/subject-restrictions',
    '/locked-sections',
    '/excelreport',
    '/api',
  ]

  const proxy: Record<string, ProxyOptions> = {}
  for (const path of httpRoutes) {
    proxy[path] = { target, changeOrigin: true }
  }
  // WebSocket proxy for socket.io
  proxy['/socket.io'] = { target: wsTarget, ws: true, changeOrigin: true }

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: {
      host: true,
      port: 5173,
      proxy,
    },
  }
})
