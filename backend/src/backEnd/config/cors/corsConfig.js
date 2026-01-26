import cors from 'cors'
const corsOption = {
  origin: '*', // Permite acceso desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Permite estos métodos HTTP
  allowedHeaders: ['Content-Type', 'Authorization'], // Permite estos encabezados
  credentials: true // Habilita las cookies
}

export default function cinfigureCors (app) {
  app.use(cors(corsOption))
}
