import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export function getPhoto(req, res) {
  const nombreImagen = req.params.nombre
  const rutaImagen = path.join(__dirname, '..', '..', '..', 'photos', nombreImagen) + '.jpg'

  if (fs.existsSync(rutaImagen)) {
    res.sendFile(rutaImagen)
  } else {
    res.status(404).send('Imagen no encontrada')
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const photosDir = path.join(__dirname, '..', '..', '..', 'photos')

    // Crear directorio si no existe
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true })
    }
    cb(null, photosDir)
  },
  filename: (req, file, cb) => {
    const customName = req.body.name || 'imagen'
    const uniqueName = `${customName}.jpg`
    cb(null, uniqueName)
  }
})

// Filtro para aceptar imágenes comunes
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
}).single('foto')

export function uploadPhoto(req, res) {
  upload(req, res, (err) => {
    if (err) {
      // Manejo de errores
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message })
      }
      return res.status(400).json({ error: err.message })
    }

    // Verificar si se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' })
    }
    // Respuesta exitosa
    res.status(200).json({
      message: 'Foto subida exitosamente',
      filename: req.file.filename,
      path: `/photos/${req.file.filename}`
    })
  })
}
