import { createTables, dropTables } from '../../backEnd/dataBase/create/createTables.js'

const flags = process.argv

async function syncTables () {
  if (flags.includes('db:drop')) {
    await dropTables()
    console.log('Tablas borradas')
    return 0
  } else if (flags.includes('db:create')) {
    await createTables()
    console.log('Tablas creadas')
    return 0
  } else if (flags.includes('db:sync')) {
    await dropTables()
    await createTables()
    console.log('Tablas sincronizadas')
    return 0
  } else {
    console.error('Argumentos inválidos')
    return 1
  }
}

syncTables()
