# Troubleshooting - Solución de Problemas

Este documento contiene errores corregidos en el proyecto y sus soluciones. Agrega nuevos problemas aquí cuando se encuentren y resuelvan.

---

## 📋 Errores Corregidos

### 1. Manejo de Bloques con Gaps en Drag & Drop

**Problema Identificado:**
El sistema no detectaba correctamente bloques de horas consecutivas cuando había gaps pequeños entre ellas.

**Síntoma:**
Eventos que deberían considerarse un solo bloque se trataban como eventos individuales.

**Causa:**
El algoritmo de detección de bloques no consideraba gaps pequeños como parte del mismo bloque.

**Solución:**
Implementar detección de bloques con umbral de 30 minutos. Si el gap entre horas consecutivas es ≤ 30 minutos, se consideran parte del mismo bloque.

**Archivos Afectados:**
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [docs/SchoolSchedule.md](./SchoolSchedule.md) - Sección "Manejo de Bloques con Gaps"

---

### 2. Validación de Conflictos en Devolución desde Depósito

**Problema Identificado:**
Al devolver la segunda hora de un bloque desde el depósito, el sistema no detectaba conflictos porque solo validaba esa hora individual.

**Síntoma:**
Se permitía devolver parcialmente un bloque cuando la primera hora estaba ocupada, causando conflictos.

**Causa:**
La función `removeFromStaging` validaba solo el evento individual, no el bloque completo.

**Solución:**
Modificar `removeFromStaging` para identificar y validar bloques completos en lugar de eventos individuales. Usar la misma lógica que `moveEventToStaging` para encontrar eventos consecutivos.

**Archivos Afectados:**
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [docs/SchoolSchedule.md](./SchoolSchedule.md) - Sección "Validación de Conflictos al Devolver"

---

### 3. Migración a Restricciones Globales

**Problema Identificado:**
Las restricciones de materias eran específicas por proyección, pero se necesitaba que fueran globales para aplicar a todas las futuras proyecciones.

**Síntoma:**
Cada nueva proyección requería configurar restricciones manualmente.

**Causa:**
El campo `proyection_id` en `subjects_restrictions` era NOT NULL.

**Solución:**
1. Cambiar `proyection_id` de NOT NULL a NULL
2. Migrar 193 restricciones existentes a globales
3. Crear backup automático: `subjects_restrictions_backup`
4. Actualizar API endpoints para soportar restricciones globales
5. Crear script de verificación automática al inicio del servidor

**Archivos Afectados:**
- `backend/src/backEnd/dataBase/models/schedule/subjectsRestrictions.js`
- `backend/src/backEnd/routes/scheduleRoutes/restrictionRoutes.js`
- `backend/src/backEnd/dataBase/querys/proyections/deleteProyection.js`
- `backend/src/backEnd/dataBase/alters/migrateToGlobalRestrictions.js`
- `backend/src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js`
- `backend/src/backEnd/index.js`

**Scripts npm:**
- `npm run migrate:restrictions` - Forzar migración
- `npm run check:migration` - Verificar necesidad
- `npm run rollback:migration` - Revertir migración

**Referencias:**
- [backend/README.md](../backend/README.md) - Sección "Migración a Restricciones Globales"

---

### 4. Bug de Suma de Horas en Reportes Trimestrales

**Problema Identificado:**
En reportes por trimestre, las horas del segundo semestre no sumaban correctamente en los totales.

**Síntoma:**
Inconsistencia entre `singleQuarterSheet.js` y `utils.js`.

**Causa:**
`singleQuarterSheet.js` determina dinámicamente si usar `q3` o `q2` para segundo semestre, pero `utils.js` siempre sumaba a `totalHoras.q3`.

**Solución:**
Cambiar línea 27 de `backend/src/backEnd/report/utils.js`:
```javascript
// ANTES (Incorrecto):
totalHoras.q3 += +item.hours.q2

// AHORA (Corregido):
totalHoras.q2 += +item.hours.q2
```

**Archivos Afectados:**
- `backend/src/backEnd/report/utils.js`

**Referencias:**
- [docs/BackendReport.md](./BackendReport.md) - Sección "Bug Corregido"

---

### 5. Error de Sintaxis en SchoolSchedule.tsx

**Problema Identificado:**
Error de sintaxis en la línea 821 de `SchoolSchedule.tsx` causado por código residual de la función anterior.

**Síntoma:**
Error Vite: `Expression expected` en línea 821.

**Causa:**
Código residual después de la función `handleDropFromStaging` que no fue eliminado correctamente durante la refactorización.

**Solución:**
1. Eliminar 67 líneas de código residual (líneas 815-881)
2. Corregir `} else {` huérfano
3. Limpiar variables no utilizadas
4. Verificar compilación exitosa

**Archivos Afectados:**
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [docs/SchoolSchedule.md](./SchoolSchedule.md) - Sección "Problemas Comunes"

---

### 6. Implementación de Drag & Drop hacia el Depósito

**Problema Identificado:**
Solo existía la opción de mover eventos al depósito mediante click, no por drag & drop.

**Síntoma:**
Experiencia de usuario limitada en modo oficial.

**Causa:**
Faltaba implementación de handlers de drag & drop en `StagingArea.tsx`.

**Solución:**
1. Agregar `onDropFromSchedule` prop a `StagingArea.tsx`
2. Implementar `handleDragOver` y `handleDrop` handlers
3. Detectar origen usando `application/schedule-event` vs `application/staged-event`
4. Agregar validación de conflictos al devolver eventos
5. Actualizar UI para indicar "Haz clic o arrastra eventos"

**Archivos Afectados:**
- `src/components/SchoolSchedule/StagingArea.tsx`
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [docs/SchoolSchedule.md](./SchoolSchedule.md) - Sección "Drag & Drop hacia el Depósito"

---

## 📝 Errores Futuros

**Plantilla para agregar nuevos errores:**

```markdown
### [Título del Error]

**Problema Identificado:**
[Descripción breve del problema]

**Síntoma:**
[Qué se observa cuando ocurre el error]

**Causa:**
[Por qué ocurre el error]

**Solución:**
[Qué se hizo para resolverlo]

**Archivos Afectados:**
- [lista de archivos modificados]

**Referencias:**
- [enlaces a documentación relacionada]
```

---

## 🔗 Referencias

- **[agents.md](../agents.md)** - Índice de documentación
- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios
- **[backend/README.md](../backend/README.md)** - Documentación backend

---

*Última actualización: 21 de abril de 2026*
