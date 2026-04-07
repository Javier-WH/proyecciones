# Reglas del Sistema de Horarios

Este documento define las reglas fundamentales del sistema de horarios. **Cualquier cambio al sistema debe respetar estas reglas**. Este archivo será actualizado periodicamente para incorporar nuevas reglas o modificaciones.

---

## Etapas del Sistema

El sistema de horarios opera en dos etapas independientes. **Las etapas no deben influir entre sí**.

### Etapa 1: Cálculo Automático del Horario

**Objetivo**: Generar automáticamente un horario basado en algoritmos de optimización.

**Características**:
- El horario se calcula automáticamente usando el algoritmo en `generateScheduleEvents`
- Utiliza restricciones de profesores, aulas, secciones, PNF, trayectos y turnos
- Considera configuraciones como `conserve_slots`, `min_consecutive_slots`, `distribute_equitably`, `prevent_single_hour_blocks`
- Los eventos generados se almacenan en `eventData`
- Se puede regenerar completamente al cambiar configuraciones o restricciones

**Estado**: El horario está "abierto" para cálculos automáticos.

**Componentes principales**:
- `generateScheduleEvents()` en `fucntions.tsx`
- Configuración del horario (`scheduleConfig`)
- Restricciones globales de materias (`subjectsRestrictions`)
- Restricciones de profesores (`teacherRestrictions`)

### Etapa 2: Horario Congelado con Depósito

**Objetivo**: Permitir cambios puntuales o de emergencia sobre un horario ya establecido.

**Características**:
- El horario se "congela" (no se regenera automáticamente)
- Se activa el **modo oficial** (botón 📦)
- Se habilita el **área de depósito** (StagingArea)
- Los eventos pueden moverse entre el horario y el depósito:
  - **Desde horario a depósito**: Click o drag & drop
  - **Desde depósito a horario**: Drag & drop
- Los movimientos dentro del horario se validan visualmente (borde rojo + mensaje de error) pero no se bloquean
- Los cambios se guardan en `lockedSections` para persistencia

**Estado**: El horario está "congelado" y solo permite ajustes manuales.

**Componentes principales**:
- `LockedSectionsStageManager` para gestión de secciones bloqueadas
- `StagingArea` para área de depósito
- `isOfficialStageMode` flag para controlar el modo
- `moveEventToStaging()`, `handleDropFromStaging()`, `handleDropBetweenCells()`
- `enqueueLockedSectionSaveFromEvents()` para persistencia

---

## Regla Fundamental: Independencia de Etapas

**Las dos etapas son completamente independientes**:

1. **La etapa 1 NO debe afectar a la etapa 2**:
   - Cambios en el algoritmo de generación no deben alterar la lógica del depósito
   - Regeneración del horario no debe eliminar o modificar secciones bloqueadas
   - Configuraciones de generación (`conserve_slots`, etc.) no deben cambiar el comportamiento del modo oficial

2. **La etapa 2 NO debe afectar a la etapa 1**:
   - Cambios manuales en el depósito no deben modificar el algoritmo de generación
   - Secciones bloqueadas no deben interferir con el cálculo automático
   - La lógica del modo oficial debe estar aislada de la lógica de generación

**Separación técnica**:
- Etapa 1: `eventData`, `generateScheduleEvents()`, configuraciones de generación
- Etapa 2: `stagedEvents`, `lockedSections`, modo oficial, drag & drop manuales

---

## Reglas Específicas por Etapa

### Reglas para Etapa 1 (Cálculo Automático)

- El algoritmo debe respetar todas las restricciones configuradas
- Los eventos generados deben tener `blockId` = `${day}-${subjectId}` para agrupación visual
- Los eventos consecutivos del mismo bloque se fusionan visualmente con `mergeConsecutiveEvents()`
- La generación debe ser determinista (mismas entradas → mismo resultado)
- Los cambios en configuraciones deben regenerar completamente el horario

### Reglas para Etapa 2 (Horario Congelado)

- Solo se puede activar cuando una sección está congelada
- El modo oficial debe ser explícito (no automático)
- Los movimientos en el horario deben mostrar conflictos visualmente pero permitir el cambio
- Los bloques con gaps (recesos) deben moverse completamente (preservando la estructura de gaps)
- Los cambios en el depósito deben persistir en `lockedSections`
- Al descongelar, los cambios manuales deben integrarse correctamente con el horario base

---

## Reglas de Drag & Drop

### Movimiento de bloques con gaps

**Problema**: Cuando una materia tiene horas no consecutivas (ej: 8:00-8:40 y 8:45-9:30), se muestran como celdas separadas.

**Solución**: Al arrastrar cualquier celda del bloque, se deben mover **todas** las horas del bloque:
- Identificar todos los eventos en `eventData` con el mismo `subjectId` + `seccion` + `día`
- Calcular el offset de tiempo entre la posición original y la nueva posición
- Aplicar el mismo offset a todos los eventos del bloque
- Esto preserva la estructura de gaps (recesos) del bloque

### Conflictos en modo oficial

- Los conflictos **NO deben bloquear** el movimiento
- Se debe mostrar un borde rojo en el evento conflictivo
- Se debe mostrar un mensaje detallado en la esquina inferior derecha
- El usuario puede decidir si acepta el conflicto o lo resuelve

### Drag & Drop entre horario y depósito

- **Horario → Depósito**: Click o drag & drop en modo oficial
- **Depósito → Horario**: Solo drag & drop
- **Devolución desde depósito**: Debe validar conflictos en la ubicación original
- **Validación de conflictos**: Se debe verificar antes de completar la devolución

---

## Reglas de Validación de Conflictos

Los conflictos se detectan en tres niveles:
1. **Profesor**: Un profesor no puede tener dos clases simultáneas
2. **Aula**: Un aula no puede ser usada por dos materias simultáneamente
3. **Sección**: Una sección (PNF + trayecto + sección) no puede tener dos clases simultáneas

**Comportamiento según etapa**:
- **Etapa 1**: El algoritmo debe evitar conflictos completamente
- **Etapa 2**: Los conflictos se muestran visualmente pero no bloquean cambios manuales

---

## Reglas de Persistencia

### Etapa 1
- Los eventos generados se guardan en la base de datos como parte de la proyección
- Las configuraciones se guardan en `scheduleConfig`
- Las restricciones se guardan en tablas específicas (`subjectsRestrictions`, `teacherRestrictions`)

### Etapa 2
- Las secciones bloqueadas se guardan en `lockedSections` (localStorage + backend)
- Los cambios manuales deben sincronizarse con el backend
- Al descongelar, los cambios deben integrarse con la proyección base

---

## Reglas de Actualización

Este documento es **vivo** y debe actualizarse cuando:
- Se añada una nueva funcionalidad que afecte el flujo de horarios
- Se modifique el comportamiento de una etapa existente
- Se descubra un patrón de uso que requiera nuevas reglas
- Se identifique un conflicto entre las dos etapas

**Antes de hacer cambios**, verificar:
1. ¿Afecta esto a la etapa 1 o etapa 2?
2. ¿Viola la regla de independencia entre etapas?
3. ¿Necesita actualizar este documento?

---

## Notas Importantes

- **El modo oficial es solo para cambios puntuales o de emergencia**
- **No usar el modo oficial para reprogramar horarios completos**
- **La generación automática debe ser el método principal para crear horarios**
- **Los cambios manuales deben ser mínimos y documentados**
- **Siempre probar cambios en modo oficial antes de aplicarlos en producción**

---

*Última actualización: 7 de abril de 2026*
