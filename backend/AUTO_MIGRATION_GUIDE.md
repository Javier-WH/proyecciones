# Sistema de Migración Automática - Guía de Uso

## 🎯 **Resumen**

El sistema de migración automática verifica y aplica la migración de restricciones globales automáticamente cuando el servidor inicia, garantizando que la base de datos siempre esté actualizada sin intervención manual.

## 🔄 **Cómo Funciona**

### **Al Iniciar el Servidor**
1. **Verificación Automática**: El script `checkAndApplyGlobalRestrictions.js` se ejecuta durante el inicio
2. **Detección Inteligente**: Verifica si la migración es necesaria mediante:
   - Estructura de la tabla (`proyection_id` nullable)
   - Existencia de restricciones globales
   - Presencia de índices antiguos
3. **Flags de Migración**: Usa la tabla `migration_flags` para evitar ejecuciones repetidas
4. **Aplicación Segura**: Si es necesario, aplica la migración con backup automático

### **Flujo de Decisión**
```
¿Existe flag de migración completada?
    Sí → ✅ Saltar migración
    No → ¿Se necesita migración?
        Sí → 🚀 Aplicar migración + crear flag
        No → ✅ Continuar normalmente
```

## 📋 **Scripts Disponibles**

### **Automáticos**
- **`npm start`** - Inicia servidor con verificación automática
- **`npm run dev`** - Desarrollo con verificación automática

### **Manuales**
```bash
# Forzar migración completa
npm run migrate:restrictions

# Verificar si se necesita migración
npm run check:migration

# Revertir migración (emergency)
npm run rollback:migration
```

## 🔧 **Componentes del Sistema**

### **1. Script Principal**
- **Archivo**: `src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js`
- **Función**: Verificación y aplicación automática
- **Características**:
  - Detección de necesidades de migración
  - Backup automático antes de cambios
  - Manejo de errores con rollback
  - Logging detallado

### **2. Integración con Servidor**
- **Archivo**: `src/backEnd/index.js`
- **Punto de integración**: Después de sincronización de BD, antes de cargar proyecciones
- **Impacto en rendimiento**: Mínimo (< 1 segundo en migraciones completadas)

### **3. Sistema de Flags**
- **Tabla**: `migration_flags`
- **Propósito**: Evitar ejecuciones repetidas
- **Campos**:
  ```sql
  CREATE TABLE migration_flags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version VARCHAR(50),
    details JSON
  )
  ```

## 🚀 **Despliegue en Servidor**

### **Paso 1: Copiar Archivos**
```bash
# Copiar archivos actualizados
scp src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js user@server:/path/to/app/
scp src/backEnd/dataBase/alters/migrateToGlobalRestrictions.js user@server:/path/to/app/
scp src/backEnd/dataBase/alters/cleanupOldRestrictionsIndex.js user@server:/path/to/app/
scp src/backEnd/index.js user@server:/path/to/app/
scp package.json user@server:/path/to/app/
```

### **Paso 2: Reiniciar Servidor**
```bash
# En el servidor
cd /path/to/app
npm install
npm start
```

### **Paso 3: Verificar**
```bash
# Revisar logs del servidor
# Buscar: "🔄 Global Restrictions Migration Check"
```

## 📊 **Logs y Monitoreo**

### **Mensajes Esperados**
```
🔄 Global Restrictions Migration Check
=====================================
✅ Migration already completed successfully
   Completed: [timestamp]
```

### **Mensajes de Migración**
```
📋 Migration is required, applying...
🚀 Applying global restrictions migration...
✅ Migration completed: X restrictions migrated
🎉 Global restrictions migration completed successfully!
```

### **Mensajes de Error**
```
⚠️  Warning: Could not check migration flag
❌ Migration failed: [error details]
⚠️  Server will continue starting, but manual migration may be required
```

## 🛠️ **Troubleshooting**

### **Problema: Migración Falla**
```bash
# Verificar estado
npm run check:migration

# Forzar migración manual
npm run migrate:restrictions

# Si todo falla, revertir y hacer manual
npm run rollback:migration
```

### **Problema: Servidor No Inicia**
1. **Verificar conexión a BD**
2. **Revisar permisos de tablas**
3. **Ejecutar migración manualmente**
4. **Verificar logs detallados**

### **Problema: Migración Lenta**
- **Normal en primera ejecución**: 2-5 minutos
- **Ejecuciones posteriores**: < 1 segundo
- **Factores**: Cantidad de restricciones, rendimiento del servidor

## 🔒 **Seguridad y Backups**

### **Backup Automático**
- **Tabla**: `subjects_restrictions_backup`
- **Creación**: Antes de cualquier modificación
- **Conservación**: Manual (eliminar cuando sea seguro)

### **Rollback Manual**
```sql
-- Restaurar desde backup
TRUNCATE TABLE subjects_restrictions;
INSERT INTO subjects_restrictions SELECT * FROM subjects_restrictions_backup;
```

## 📈 **Beneficios Logrados**

### **Automatización**
- ✅ Cero intervención manual requerida
- ✅ Detección automática de necesidades
- ✅ Aplicación segura con rollback

### **Confiabilidad**
- ✅ Verificación en cada inicio
- ✅ Prevención de migraciones duplicadas
- ✅ Logging detallado para debugging

### **Performance**
- ✅ Mínimo impacto en tiempo de inicio
- ✅ Ejecución única con flags
- ✅ Verificaciones rápidas y eficientes

## 🎯 **Mejores Prácticas**

### **Para Desarrolladores**
1. **Probar en staging antes de producción**
2. **Monitorear logs durante primer inicio**
3. **Mantener backup hasta verificación completa**
4. **Documentar cualquier incidencia**

### **Para SysAdmins**
1. **Verificar espacio en disco para backups**
2. **Monitorear tiempo de inicio primer vez**
3. **Tener plan de rollback listo**
4. **Documentar estado post-migración**

---

**Estado**: ✅ IMPLEMENTADO Y TESTEADO  
**Versión**: 1.0.0  
**Mantenimiento**: Bajo (solo si se agregan nuevas migraciones)
