import Perfil from '#models/perfil.js'
import Subjects from '#models/subjects.js'
import {
  generateSubjectProfileId,
  normalizeProfileEntry
} from '#utils/subjectProfile.js'

const flags = new Set(process.argv.slice(2))
const dryRun = flags.has('--dry-run')

async function migrateSubjectProfiles () {
  const subjects = await Subjects.findAll({ attributes: ['id', 'name'], raw: true })
  const subjectsByLegacyId = new Map()
  const subjectsByNormalizedId = new Map()

  subjects.forEach(({ id, name }) => {
    subjectsByLegacyId.set(id, name)
    const normalizedId = generateSubjectProfileId(name)
    if (normalizedId) {
      subjectsByNormalizedId.set(normalizedId, name)
    }
  })

  const registros = await Perfil.findAll({ raw: true })

  let updated = 0
  let skippedMissingName = 0
  let alreadyAligned = 0

  for (const registro of registros) {
    const catalogName = subjectsByLegacyId.get(registro.subject_id) || subjectsByNormalizedId.get(registro.subject_id)
    const subjectName = registro.subject_name || catalogName
    const normalizedFromName = subjectName ? generateSubjectProfileId(subjectName) : null
    const normalizedFallback = registro.subject_id ? normalizeProfileEntry(registro.subject_id) : null
    const normalizedId = normalizedFromName || normalizedFallback
    const needsIdUpdate = normalizedId && normalizedId !== registro.subject_id
    const needsNameUpdate = subjectName && subjectName !== registro.subject_name

    if (!needsIdUpdate && !needsNameUpdate) {
      alreadyAligned++
      continue
    }

    if (!normalizedId) {
      skippedMissingName++
      continue
    }

    updated++
    if (!dryRun) {
      await Perfil.update(
        {
          subject_id: normalizedId,
          subject_name: subjectName || registro.subject_name
        },
        { where: { id: registro.id } }
      )
    }
  }

  console.log('\nMigración de perfiles de materias')
  console.log(`  Total registros revisados: ${registros.length}`)
  console.log(`  Actualizados${dryRun ? ' (simulado)' : ''}: ${updated}`)
  console.log(`  Ya compatibles: ${alreadyAligned}`)
  console.log(`  Omitidos por falta de nombre: ${skippedMissingName}`)

  if (dryRun) {
    console.log('\nEjecute sin --dry-run para aplicar los cambios.')
  } else {
    console.log('\n¡Migración completada!')
  }
}

migrateSubjectProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error durante la migración de perfiles:', error)
    process.exit(1)
  })
