import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200 
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy all API requests to the Express backend
      '/login': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
      '/config': 'http://localhost:3000',
      '/teachers': 'http://localhost:3000',
      '/teacher': 'http://localhost:3000',
      '/user': 'http://localhost:3000',
      '/pnf': 'http://localhost:3000',
      '/pnfs': 'http://localhost:3000',
      '/subject': 'http://localhost:3000',
      '/trayectos': 'http://localhost:3000',
      '/turnos': 'http://localhost:3000',
      '/proyeccion': 'http://localhost:3000',
      '/proyeccions': 'http://localhost:3000',
      '/proyecciones': 'http://localhost:3000',
      '/profile': 'http://localhost:3000',
      '/profileNames': 'http://localhost:3000',
      '/contractType': 'http://localhost:3000',
      '/contractTypes': 'http://localhost:3000',
      '/simpleData': 'http://localhost:3000',
      '/setProyection': 'http://localhost:3000',
      '/pensum': 'http://localhost:3000',
      '/photo': 'http://localhost:3000',
      '/classroom': 'http://localhost:3000',
      '/classrooms': 'http://localhost:3000',
      '/schedule': 'http://localhost:3000',
      '/schedule-config': 'http://localhost:3000',
      '/teacher-restrictions': 'http://localhost:3000',
      '/subject-restrictions': 'http://localhost:3000',
      '/excelreport': 'http://localhost:3000',
      '/subjectinprofile': 'http://localhost:3000',
    }
  }
})
