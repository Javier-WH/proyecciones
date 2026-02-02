import cors from 'cors'
const corsOption = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any localhost origin
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    // Allow specific production domains if needed (add them here)
    // if (origin === 'https://myapp.com') return callback(null, true);

    // Default: allow all (but be careful with credentials)
    // For now, let's allow all to debug, but we must return the origin to support credentials
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Permite estos métodos HTTP
  allowedHeaders: ['Content-Type', 'Authorization'], // Permite estos encabezados
  credentials: true // Habilita las cookies
}

export default function cinfigureCors(app) {
  app.use(cors(corsOption))
}
