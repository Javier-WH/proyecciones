import express from 'express'
import LockedSections from '#models/schedule/lockedSections.js'
import Proyections from '#models/proyections.js'
import sequelize from '#dataBaseConnection'

const Router = express.Router()

// GET - Obtener todas las secciones bloqueadas para una proyección
Router.get('/locked-sections/:proyectionId', async (req, res) => {
  try {
    const { proyectionId } = req.params

    if (!proyectionId) {
      return res.status(400).json({ message: 'proyectionId es requerido' })
    }

    const records = await LockedSections.findAll({
      where: { proyection_id: proyectionId },
      raw: true
    })

    // Convert array of records into a Record<string, Event[]> object
    const lockedSections = {}
    for (const record of records) {
      let events = record.events
      if (typeof events === 'string') {
        try {
          events = JSON.parse(events)
        } catch (e) {
          events = []
        }
      }
      lockedSections[record.section_key] = Array.isArray(events) ? events : []
    }

    return res.status(200).json({ lockedSections })
  } catch (error) {
    console.error('Error al obtener locked sections:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// POST - Guardar/actualizar secciones bloqueadas (bulk replace)
Router.post('/locked-sections', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { proyection_id, locked_sections } = req.body

    if (!proyection_id) {
      return res.status(400).json({ message: 'proyection_id es requerido' })
    }

    if (!locked_sections || typeof locked_sections !== 'object') {
      return res.status(400).json({ message: 'locked_sections debe ser un objeto' })
    }

    const proyection = await Proyections.findByPk(proyection_id, { attributes: ['id'], raw: true })
    if (!proyection) {
      return res.status(404).json({ message: 'La proyección indicada no existe' })
    }

    await sequelize.transaction(async (transaction) => {
      // Fetch existing keys to know which ones to delete (avoid full-table lock)
      const existing = await LockedSections.findAll({
        where: { proyection_id },
        attributes: ['section_key'],
        raw: true,
        transaction
      })
      const existingKeys = new Set(existing.map(r => r.section_key))
      const incomingKeys = new Set(Object.keys(locked_sections))

      // Delete keys that are no longer present
      const keysToDelete = [...existingKeys].filter(k => !incomingKeys.has(k))
      if (keysToDelete.length > 0) {
        await LockedSections.destroy({
          where: { proyection_id, section_key: keysToDelete },
          transaction
        })
      }

      // Upsert new/updated keys
      for (const [sectionKey, events] of Object.entries(locked_sections)) {
        if (Array.isArray(events)) {
          await LockedSections.upsert({
            proyection_id,
            section_key: sectionKey,
            events
          }, { transaction })
        }
      }
    })

    return res.status(200).json({ message: 'Secciones bloqueadas guardadas correctamente' })
  } catch (error) {
    console.error('Error al guardar locked sections:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// PUT - Actualizar una sección bloqueada específica
Router.put('/locked-sections', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { proyection_id, section_key, events, stage } = req.body

    if (!proyection_id || !section_key) {
      return res.status(400).json({ message: 'proyection_id y section_key son requeridos' })
    }

    const [record, created] = await LockedSections.findOrCreate({
      where: { proyection_id, section_key },
      defaults: {
        events: Array.isArray(events) ? events : [],
        stage: stage || 'planning'
      }
    })

    if (!created) {
      await record.update({
        events: Array.isArray(events) ? events : [],
        ...(stage ? { stage } : {})
      })
    }

    return res.status(200).json({ message: created ? 'Sección bloqueada creada' : 'Sección bloqueada actualizada' })
  } catch (error) {
    console.error('Error al actualizar locked section:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// DELETE - Eliminar una sección bloqueada específica
Router.delete('/locked-sections/:proyectionId/:sectionKey', async (req, res) => {
  try {
    const { proyectionId, sectionKey } = req.params

    if (!proyectionId || !sectionKey) {
      return res.status(400).json({ message: 'proyectionId y sectionKey son requeridos' })
    }

    const deleted = await LockedSections.destroy({
      where: { proyection_id: proyectionId, section_key: decodeURIComponent(sectionKey) }
    })

    if (deleted === 0) {
      return res.status(404).json({ message: 'Sección bloqueada no encontrada' })
    }

    return res.status(200).json({ message: 'Sección bloqueada eliminada' })
  } catch (error) {
    console.error('Error al eliminar locked section:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// DELETE - Eliminar todas las secciones bloqueadas de una proyección
Router.delete('/locked-sections/all/:proyectionId', async (req, res) => {
  try {
    const { proyectionId } = req.params

    if (!proyectionId) {
      return res.status(400).json({ message: 'proyectionId es requerido' })
    }

    await LockedSections.destroy({
      where: { proyection_id: proyectionId }
    })

    return res.status(200).json({ message: 'Todas las secciones bloqueadas eliminadas' })
  } catch (error) {
    console.error('Error al eliminar todas las locked sections:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// PUT - Cambiar etapa de una sección bloqueada (planning -> official)
Router.put('/locked-sections/:proyectionId/:sectionKey/stage', express.json(), async (req, res) => {
  try {
    const { proyectionId, sectionKey } = req.params
    const { stage } = req.body

    if (!proyectionId || !sectionKey || !stage) {
      return res.status(400).json({ message: 'proyectionId, sectionKey y stage son requeridos' })
    }

    if (!['planning', 'official'].includes(stage)) {
      return res.status(400).json({ message: "Stage debe ser 'planning' o 'official'" })
    }

    const [updated] = await LockedSections.update(
      { stage },
      {
        where: { proyection_id: proyectionId, section_key: decodeURIComponent(sectionKey) }
      }
    )

    if (updated === 0) {
      return res.status(404).json({ message: 'Sección bloqueada no encontrada' })
    }

    return res.status(200).json({ message: `Etapa de sección actualizada a '${stage}'` })
  } catch (error) {
    console.error('Error al actualizar stage de locked section:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default Router
