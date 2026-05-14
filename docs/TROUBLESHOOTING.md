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

### 5. Cambio de Aula en Sección Congelada: Recálculo Indiscriminado

**Problema Identificado:**
Al cambiar el aula de una materia en una sección congelada, el sistema siempre intentaba recalcular el horario cuando detectaba un conflicto, sin distinguir si el conflicto era con una sección congelada (inamovible) o con una sección descongelada (recolocable).

**Síntoma:**
- Happy Path (conflicto con sección descongelada): el recálculo funcionaba correctamente.
- Sad Path (conflicto con sección congelada): el recálculo fallaba silenciosamente porque el algoritmo no puede mover secciones congeladas, dejando el conflicto sin resolver y sin advertencia clara al usuario.

**Causa:**
El bloque de manejo de conflictos para secciones congeladas (`isFrozen`) simplemente verificaba `conflictMap.size > 0` y siempre disparaba `schedule:regenerate`. No analizaba la naturaleza del evento conflictivo.

**Solución:**
1. Después de detectar conflictos, iterar sobre los eventos simulados y encontrar los eventos reales que causan conflicto de aula.
2. Para cada evento conflictivo, construir su `sectionKey` y verificar si existe en `lockedSections`.
3. **Happy Path** (`hasConflictWithUnfrozenSection = true`, `hasConflictWithFrozenSection = false`): guardar el override y disparar `schedule:regenerate` para que el backend recoloque la sección descongelada.
4. **Sad Path** (`hasConflictWithFrozenSection = true`): mostrar `message.error()` explicando que el aula está ocupada por una sección congelada, NO disparar recálculo, y mantener los conflictos marcados con borde rojo en la UI.

**Archivos Afectados:**
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [SCHEDULE_RULES.md](../SCHEDULE_RULES.md) §7.2 — Effects of freezing
- [agents.md](../agents.md) §7.3 — Locked sections

---

### 6. Deadlock en `frozen_sections` al Descongelar Sección

**Problema Identificado:**
MySQL reportaba `ER_LOCK_DEADLOCK` (error 1213) cuando un usuario descongelaba una sección. El deadlock ocurría en la tabla `frozen_sections` durante un `INSERT ... ON DUPLICATE KEY UPDATE`.

**Síntoma:**
- Log del backend: `Error al guardar locked sections: Error ... SequelizeDatabaseError ... Deadlock found when trying to get lock`
- La operación de descongelar fallaba intermitentemente.

**Causa:**
Dos rutas de escritura competían simultáneamente por las mismas filas de `frozen_sections`:
1. **Socket handler** (`schedule:toggleFreeze` en `scheduleHandlers.js`): al descongelar, hace `LockedSections.destroy()` y luego `recalcSchedulesForProyection()`, que lee `frozen_sections` via `loadLockedSections()`.
2. **Legacy HTTP bulk-save** (`POST /locked-sections` en `lockedSectionsRoutes.js`): el frontend tenía un `useEffect` en `mainContext.tsx` con debounce de 500ms que enviaba el objeto completo de `lockedSections` vía HTTP cada vez que cambiaba. Este POST abría una transacción, hacía `findAll` + `destroy` + `upsert` en bucle.

Cuando el usuario descongelaba una sección, el socket handler modificaba `frozen_sections` e iniciaba recálculo. Casi inmediatamente, el frontend recibía el broadcast `schedule:state`, actualizaba su estado local, y el `useEffect` con debounce disparaba el POST HTTP. La transacción del POST competía con las operaciones autocommit del socket handler y con las lecturas del recálculo, produciendo deadlock.

**Solución:**
1. En `src/context/mainContext.tsx`: agregar `socket?.connected` como early-return en el `useEffect` de guardado. Cuando el socket está conectado, el backend maneja la persistencia de locked sections; el frontend no debe enviar el bulk-save HTTP.
2. En `src/components/SchoolSchedule/SchoolSchedule.tsx`: agregar la misma guarda `scheduleConnected` en el `useEffect` de `pendingLockedSectionSaves`, que también persistía secciones individuales vía HTTP (`PUT /locked-sections`).

**Archivos Afectados:**
- `src/context/mainContext.tsx`
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [agents.md](../agents.md) §7.3 — Locked sections
- [docs/BackendScheduleSync.md](./BackendScheduleSync.md) — Backend-driven schedule architecture

### 7. Version Conflicts Masivos al Congelar/Descongelar Secciones Rápidamente

**Problema Identificado:**
Al congelar y descongelar secciones repetidamente en rápida sucesión, el backend generaba una cascada de errores `VERSION_CONFLICT` y el proxy de Vite reportaba `ECONNRESET`/`ECONNABORTED`.

**Síntoma:**
- Logs del backend: `[scheduleService] q1 version conflict, skipping` repetidos para q1, q2, q3.
- El frontend perdía la conexión con el backend (ECONNRESET en Vite proxy).
- El estado final podía quedar inconsistente entre trimestres.

**Causa:**
1. `schedule:toggleFreeze` llamaba `recalcSchedulesForProyection`, que recalculaba **los 3 trimestres secuencialmente** dentro de un mismo handler. Cada trimestre usa `applyAction` con `SELECT ... FOR UPDATE`.
2. Si el usuario hacía 3 clicks rápidos, se lanzaban 3 handlers `toggleFreeze` concurrentemente. Cada uno leía la misma versión base de los trimestres, y al intentar escribir, solo el primero tenía éxito; los demás fallaban con `VERSION_CONFLICT`.
3. Como cada recalc de 3 trimestres tomaba varios segundos, los handlers se solapaban y se bloqueaban mutuamente.

**Solución:**
1. **Refactorizar `scheduleService.js`**: extraer `recalcSingleTrimestre` de `recalcSchedulesForProyection`. La nueva función acepta un contexto pre-cargado (para no repetir queries cuando se recalculan múltiples trimestres) y tiene retry automático con backoff exponencial (3 intentos) ante `VERSION_CONFLICT`.
2. **Extraer trimestre del `sectionKey`**: el `sectionKey` tiene formato `pnfId-trayectoId-seccion-trimestre`. Al togglear, el backend extrae el trimestre y solo recalcula ese trimestre, no los 3.
3. **Recalc en background**: `schedule:toggleFreeze` responde al cliente inmediatamente (`ok({})`) y lanza el recalc en background (`Promise` sin `await`). Esto reduce la latencia percibida y evita que el Vite proxy timeoutee.

**Archivos Afectados:**
- `backend/src/backEnd/schedule/scheduleService.js`
- `backend/src/backEnd/socket/scheduleHandlers.js`

**Referencias:**
- [agents.md](../agents.md) §7.3 — Locked sections
- [docs/BackendScheduleSync.md](./BackendScheduleSync.md)

### 8. Happy Path de Sección Congelada: Borde rojo persistente y hash mismatch en sync

**Problema Identificado:**
Al cambiar el aula de una materia en la única sección congelada, el sistema no distinguía correctamente entre conflictos resalables (sección descongelada → Happy Path) e irresolubles (sección congelada → Sad Path). Además, un **hash mismatch** entre el inbound sync y el outbound sync causaba que el estado correcto del backend nunca se estabilizara en el frontend, forzando un refresh manual para ver el resultado.

**Síntoma:**
- Happy Path (conflicto con sección descongelada): se marcaba borde rojo de conflicto que persistía hasta refrescar el navegador.
- El recálculo del backend SÍ ocurría correctamente (al refrescar se veía bien), pero el frontend no lo reflejaba sin refresh.

**Causa:**
1. **Hash mismatch crítico**: El inbound sync (`schedule:state`) calculaba `lastSyncedHashRef` con `{eventData, classroomOverrides}`, pero el outbound sync comparaba contra `{eventData, classroomOverrides, lockedSections}`. Los hashes **nunca coincidían**, causando un bucle infinito de `schedule:setState` que empujaba estado al backend continuamente, enterrando el broadcast correcto del recálculo.
2. El inbound sync nunca actualizaba `classroomOverrides` desde el backend, dejándolo stale.
3. Ghost events (`isCrossQuarterGhost`) en `eventsToCheck` causaban falsos positivos en `hasConflictWithFrozenSection`.
4. `handleDrop` mostraba errores para secciones congeladas sin distinguir Happy vs Sad Path.

**Solución:**
1. **Unificar el hash**: El inbound sync ahora computa `lastSyncedHashRef` con los mismos tres campos (`eventData`, `classroomOverrides`, `lockedSections`) que el outbound sync, y lo hace DESPUÉS de todos los state updates.
2. Sincronizar `classroomOverrides` desde el backend en el inbound sync y limpiar `hasUnsavedOverrides`.
3. Filtrar `isCrossQuarterGhost` de `allEventsBeforeChange` y excluir la propia sección (`currentSectionKey`) del análisis Happy/Sad Path.
4. En `handleDrop`, diferenciar conflicto con sección congelada (Sad Path: error, abortar) vs descongelada (Happy Path: proceder, backend recalcula).
5. En Happy Path, limpiar `eventsWithConflicts` de los eventos modificados (el `useEffect` reactivo los recalculará con el estado del backend).

**Archivos Afectados:**
- `src/components/SchoolSchedule/SchoolSchedule.tsx`

**Referencias:**
- [SCHEDULE_RULES.md](../SCHEDULE_RULES.md) §7 — Locked sections
- [agents.md](../agents.md) §7.3 — Locked sections

---

## 🔗 Referencias

- **[agents.md](../agents.md)** - Índice de documentación
- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios
- **[backend/README.md](../backend/README.md)** - Documentación backend

---

*Last updated: May 14, 2026*
