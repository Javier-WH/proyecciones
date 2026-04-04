import sequelize from '../../backEnd/dataBase/connection/ORMconnection.js'
import LockedSections from '../../backEnd/dataBase/models/schedule/lockedSections.js'
import fs from 'fs'

/**
 * Modo de uso:
 * 1. Coloca el JSON exportado en un archivo llamado "data_to_import.json" en este mismo directorio.
 * 2. Ejecuta: node src/dev/CLI/importFrozenSections.js <proyection_id>
 */

const proyectionId = process.argv[2]

if (!proyectionId) {
  console.error('ERROR: Debes proporcionar el proyection_id como argumento.')
  console.log('Ejemplo: node src/dev/CLI/importFrozenSections.js d9827-...')
  process.exit(1)
}

async function runMigration () {
  try {
    const rawData = fs.readFileSync('./src/dev/CLI/data_to_import.json', 'utf8')
    const frozenData = JSON.parse(rawData)

    console.log(`--- Iniciando migración de ${Object.keys(frozenData).length} secciones ---`)

    const transaction = await sequelize.transaction()
    try {
      // Opcional: limpiar datos previos de esa proyección para evitar conflictos
      await LockedSections.destroy({ where: { proyection_id: proyectionId }, transaction })

      const records = []
      for (const [key, events] of Object.entries(frozenData)) {
        records.push({
          proyection_id: proyectionId,
          section_key: key,
          events
        })
      }

      await LockedSections.bulkCreate(records, { transaction })
      await transaction.commit()
      console.log('✔ Sincronización completada exitosamente.')
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (error) {
    console.error('ERROR en la migración:', error.message)
  } finally {
    process.exit(0)
  }
}

runMigration()
