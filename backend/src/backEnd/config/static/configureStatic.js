import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

export default function configureStatic (app) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  app.use('/assets', express.static(path.join(__dirname, '..', '..', '..', 'frontEnd', 'assets')))
}
