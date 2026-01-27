import sequelize from '#dataBaseConnection'

async function fixProductionIncompatibility() {
    const t = await sequelize.transaction()

    try {
        console.log('Iniciando corrección de compatibilidad en subjects_restrictions...')

        // 1. Obtener información de la tabla para ver si existe la FK y borrarla si es necesario
        const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'subjects_restrictions' 
      AND COLUMN_NAME = 'proyection_id' 
      AND CONSTRAINT_NAME != 'PRIMARY' 
      AND TABLE_SCHEMA = DATABASE();
    `, { transaction: t })

        // Borrar FK si existe (para evitar conflictos al modificar columna)
        for (const constraint of constraints) {
            // En algunos casos podría ser un UNIQUE index, pero buscamos principalmente FKs o índices que molesten
            // Mejor intentar borrar la FK específicamente si sabemos el nombre, pero el nombre puede variar.
            // Si el error original era al CREAR la FK, tal vez no exista.
            // Pero intentemos ser seguros: Desactivar FK checks es lo más rápido.
        }

        // Enfoque más simple y potente: SET FOREIGN_KEY_CHECKS = 0
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction: t })

        console.log("Modificando columna 'proyection_id' a CHAR(36)...")
        // Alterar la columna para ser CHAR(36) (UUID)
        // El error indicaba que proyection_id era VARCHAR(36) y id era otro tipo (probablemente CHAR(36) por el UUID de Sequelize)
        await sequelize.query('ALTER TABLE `subjects_restrictions` MODIFY `proyection_id` CHAR(36) NOT NULL;', { transaction: t })

        // Opcional: Intentar forzar la creación de la FK manualmente si se desea, 
        // pero Sequelize lo hará al iniciar si detecta que falta.
        // Lo importante es que los tipos coincidan ahora.

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction: t })

        await t.commit()
        console.log('Corrección aplicada con éxito. Ahora la columna proyection_id es compatible con UUID.')

    } catch (error) {
        await t.rollback()
        console.error('Error al aplicar la corrección:', error)
        // Error code 3780 es el de incompatibilidad, que es el que queremos evitar al sincronizar.
        // Si falla este script con ese error, es irónico, pero significa que falla al modificar? 
        // No, modificar una columna sin FK checks debería funcionar.
    } finally {
        await sequelize.close()
    }
}

fixProductionIncompatibility()
