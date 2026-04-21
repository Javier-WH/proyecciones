# Sistema de Horarios Escolares - SchoolSchedule

Este módulo gestiona el sistema completo de horarios escolares, incluyendo generación automática, modo oficial con depósito, y visualización interactiva con FullCalendar.

---

## 📋 Descripción General

El sistema de horarios opera en **dos etapas independientes**:

### Etapa 1: Cálculo Automático
- Generación automática de horarios usando algoritmos de optimización
- Configuración flexible (días, turnos, restricciones)
- Validación de conflictos en tiempo real
- Regeneración completa al cambiar configuraciones

### Etapa 2: Horario Congelado (Modo Oficial)
- Horario "congelado" para cambios puntuales
- Área de depósito (StagingArea) para mover eventos temporalmente
- Drag & drop entre horario y depósito
- Persistencia de cambios en `lockedSections`

**CRÍTICO**: Las dos etapas son completamente independientes. Ver `SCHEDULE_RULES.md` para detalles.

---

## 🎯 Componentes Principales

### SchoolSchedule.tsx
Componente principal del sistema de horarios.

**Funcionalidades:**
- Visualización de horarios con FullCalendar
- Generación automática de horarios
- Modo oficial con depósito
- Gestión de restricciones (profesores, materias, aulas)
- Configuración de horarios (días, turnos)
- Exportación e impresión

**Estado Principal:**
```typescript
- eventData: Event[] - Eventos del horario actual
- stagedEvents: Event[] - Eventos en el depósito
- isOfficialStageMode: boolean - Modo oficial activo
- scheduleConfig: ScheduleConfig - Configuración del horario
- lockedSections: LockedSection[] - Secciones bloqueadas
```

### fucntions.tsx
Lógica central de generación de horarios.

**Funciones Principales:**
- `generateScheduleEvents()` - Generación automática de horarios
- `mergeConsecutiveEvents()` - Fusión de eventos consecutivos
- `OccupancyTracker` - Rastreo de ocupación de recursos
- `tryPlaceDecomposition()` - Algoritmo de colocación
- `findSlotPlacements()` - Búsqueda de espacios disponibles

**CRÍTICO**: Ver `REGLAS_GENERACION_HORARIOS.md` antes de modificar cualquier función de generación.

### StagingArea.tsx
Área de depósito para modo oficial.

**Funcionalidades:**
- Muestra eventos movidos temporalmente
- Agrupación por materia
- Devolución de eventos al horario
- Drag & drop desde/hacia el horario
- Validación de conflictos al devolver

**Props Importantes:**
```typescript
interface StagingAreaProps {
  stagedEvents: Event[];
  onRemoveGroupFromStaging: (events: Event[]) => void;
  onClearAll: () => void;
  onConfirmChanges: () => void;
  onDropFromSchedule?: (event: Event) => void;
}
```

### LockedSectionsStageManager.tsx
Gestor de secciones bloqueadas.

**Funcionalidades:**
- Persistencia de cambios manuales
- Sincronización con backend
- Gestión de cola de guardados
- Integración con horario base

### Modales de Configuración
- `ScheduleConfigModal.tsx` - Configuración de días, turnos, parámetros
- `TeacherRestrictionModal.tsx` - Restricciones de disponibilidad de profesores
- `SubjectRestrictionModal.tsx` - Restricciones de aulas por materia
- `ClassroomManagerModal.tsx` - Gestión de aulas
- `ClassroomOverridesModal.tsx` - Overrides de aulas específicas
- `ErrorsModal.tsx` - Visualización de errores de generación

---

## 🔧 Funciones Clave

### generateScheduleEvents()
Función principal de generación automática.

**Parámetros:**
```typescript
interface generateScheduleParams {
  subjects: Subject[];
  classrooms: Classroom[];
  trimestre: "q1" | "q2" | "q3";
  unavailableDays?: { teacherId: string; days: number[]; hours?: any[] }[];
  preferredClassrooms?: { subjectKey: string; classroomIds: string[] }[];
  classroomOverrides?: ClassroomOverride[];
  conserveSlots?: number; // Máximo de horas diarias (default: 3)
  minConsecutiveSlots?: number; // Mínimo de horas consecutivas
  distributeEquitably?: boolean; // Distribución equitativa
  preventSingleHourBlocks?: boolean; // Evitar bloques de 1 hora
  breaks?: { start: string; end: string }[];
  lockedEvents?: Event[];
}
```

**Algoritmo:**
1. Preparación de datos (filtrado, normalización)
2. Asignación inicial con restricciones estrictas
3. Fase de relajación (si hay errores)
4. Asignación parcial (último recurso)
5. Fusión de eventos consecutivos

**CRÍTICO**: Ver `REGLAS_GENERACION_HORARIOS.md` para reglas de implementación.

### mergeConsecutiveEvents()
Fusiona eventos consecutivos del mismo bloque.

**Lógica:**
- Agrupa eventos por `blockId` (formato: `${day}-${subjectId}`)
- Fusiona eventos con horas consecutivas
- Preserva gaps > 30 minutos (recesos)

### Drag & Drop Handlers

**Desde Horario a Depósito:**
```typescript
moveEventToStaging(event: Event, day: number) {
  // Identifica bloque completo
  // Valida modo oficial
  // Mueve a stagedEvents
  // Remueve de eventData
  // Guarda en lockedSections
}
```

**Desde Depósito a Horario:**
```typescript
handleDropFromStaging(event: Event, targetDay: number, targetStartTime: string) {
  // Identifica bloque completo (incluyendo gaps)
  // Valida conflictos
  // Intercambia eventos si es necesario
  // Mueve a eventData
  // Remueve de stagedEvents
  // Guarda en lockedSections
}
```

**Entre Celdas del Horario:**
```typescript
handleDropBetweenCells(event: Event, targetDay: number, targetStartTime: string) {
  // Valida modo oficial
  // Muestra conflictos visualmente
  // Permite cambio (no bloquea)
  // Guarda en lockedSections
}
```

---

## ⚠️ Reglas Críticas

### Reglas de Generación Automática
Ver `REGLAS_GENERACION_HORARIOS.md` para reglas detalladas:

1. **Máximo de horas diarias**: `conserveSlots` es absoluto, nunca se puede superar
2. **No repetir materia en bloques no consecutivos**: Una materia no puede aparecer dos veces en el mismo día separadamente
3. **Restricciones del profesor son absolutas**: Nunca se relajan
4. **Consistencia de blockId**: Formato `${day}-${subjectId}`
5. **Fase de relajación solo relaja mínimo consecutivo**: Nunca modifica `conserveSlots`

### Reglas de Modo Oficial
Ver `SCHEDULE_RULES.md` para reglas detalladas:

1. **Independencia de etapas**: Cambios en modo oficial no afectan generación automática
2. **Bloques con gaps**: Al mover un bloque, se mueven todas las horas (preservando estructura de gaps)
3. **Conflictos visuales**: Se muestran pero no bloquean cambios
4. **Persistencia**: Todos los cambios se guardan en `lockedSections`

---

## 🎨 Patrones de Código

### Detección de Bloques con Gaps
```typescript
// Identificar todos los eventos del mismo bloque
const allSubjectEvents = eventData.filter(e =>
  e.daysOfWeek?.[0] === day &&
  e.extendedProps?.subjectId === subjectId &&
  e.extendedProps?.seccion === seccion
);

// Ordenar por hora de inicio
allSubjectEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

// Buscar eventos consecutivos (incluyendo gaps ≤ 30 min)
const blockEvents = [event];
for (let i = eventIndex - 1; i >= 0; i--) {
  const timeDiff = getTimeDifferenceInMinutes(prevEndTime, currentStartTime);
  if (timeDiff <= 30) {
    blockEvents.unshift(prevEvent);
  } else {
    break;
  }
}
```

### Validación de Conflictos
```typescript
const checkEventConflicts = (event: Event, day: number, startTime: string) => {
  const conflicts: string[] = [];
  
  // Conflicto de profesor
  const teacherConflict = eventData.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.startTime === startTime &&
    e.extendedProps?.professorId === event.extendedProps?.professorId
  );
  
  // Conflicto de aula
  const classroomConflict = eventData.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.startTime === startTime &&
    e.extendedProps?.classroomId === event.extendedProps?.classroomId
  );
  
  // Conflicto de sección
  const sectionConflict = eventData.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.startTime === startTime &&
    e.extendedProps?.pnfId === event.extendedProps?.pnfId &&
    e.extendedProps?.trayectoId === event.extendedProps?.trayectoId &&
    e.extendedProps?.seccion === event.extendedProps?.seccion
  );
  
  return conflicts;
};
```

### Persistencia de Cambios
```typescript
const enqueueLockedSectionSave = (events: Event[]) => {
  const pendingSaves = events.map(event => ({
    key: `${event.extendedProps?.subjectId}-${event.extendedProps?.seccion}-${event.daysOfWeek?.[0]}`,
    pnfId: event.extendedProps?.pnfId,
    trayectoId: event.extendedProps?.trayectoId,
    seccion: event.extendedProps?.seccion,
    trim: currentTrim,
    eventData: event
  }));
  
  // Enviar al backend
  upsertLockedSection(pendingSaves);
};
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Bloques con gaps no se mueven completos
**Síntoma**: Al arrastrar un bloque con recesos (ej: 8:00-8:40 y 8:45-9:30), solo se mueve una hora.

**Causa**: La detección de bloques solo consideraba slots consecutivos.

**Solución**: Usar detección temporal con umbral de 30 minutos:
```typescript
const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
};
```

### Problema: Devolución desde depósito no valida conflictos
**Síntoma**: Se devuelve un evento a una ubicación ocupada sin advertencia.

**Solución**: Validar antes de devolver:
```typescript
const conflicts = checkEventConflicts(event, targetDay, targetStartTime);
if (conflicts.length > 0) {
  Modal.warning({
    title: "Ubicación Ocupada",
    content: conflicts.join('\n')
  });
  return;
}
```

### Problema: Regeneración elimina secciones bloqueadas
**Síntoma**: Al regenerar el horario, se pierden los cambios manuales.

**Causa**: La generación no consideraba `lockedEvents`.

**Solución**: Pasar `lockedEvents` a `generateScheduleEvents` y respetarlos durante la generación.

---

## 📁 Archivos del Módulo

```
src/components/SchoolSchedule/
├── SchoolSchedule.tsx - Componente principal
├── fucntions.tsx - Lógica de generación
├── StagingArea.tsx - Área de depósito
├── LockedSectionsStageManager.tsx - Gestor de secciones bloqueadas
├── ScheduleConfigModal.tsx - Configuración de horarios
├── TeacherRestrictionModal.tsx - Restricciones de profesores
├── SubjectRestrictionModal.tsx - Restricciones de materias
├── ClassroomManagerModal.tsx - Gestión de aulas
├── ClassroomOverridesModal.tsx - Overrides de aulas
├── ErrorsModal.tsx - Visualización de errores
├── PrintableSchedule.tsx - Versión imprimible
├── REGLAS_GENERACION_HORARIOS.md - Reglas de generación
├── SchoolSchedule.css - Estilos
├── StagingArea.module.css - Estilos de depósito
└── modal.module.css - Estilos de modales
```

---

## 🔗 Referencias a Otros Documentos

- **[SCHEDULE_RULES.md](../SCHEDULE_RULES.md)** - Reglas fundamentales del sistema de horarios
- **[REGLAS_GENERACION_HORARIOS.md](../src/components/SchoolSchedule/REGLAS_GENERACION_HORARIOS.md)** - Reglas específicas de generación automática
- **[docs/BackendSchedule.md](./BackendSchedule.md)** - Lógica de horarios en el backend
- **[docs/Context.md](./Context.md)** - Gestión de estado global

---

## 🧪 Pruebas Recomendadas

### Generación Automática
1. Crear horario con configuración básica
2. Probar diferentes configuraciones (días, turnos, conserveSlots)
3. Verificar que no se supera el máximo de horas diarias
4. Verificar que no se repiten materias en bloques no consecutivos
5. Probar con restricciones de profesores y aulas

### Modo Oficial
1. Activar modo oficial con sección congelada
2. Mover evento de horario a depósito (click y drag & drop)
3. Mover evento de depósito a horario (drag & drop)
4. Probar bloques con gaps (recesos)
5. Verificar persistencia de cambios
6. Descongelar y verificar integración con horario base

### Conflictos
1. Intentar mover evento a ubicación ocupada
2. Verificar que se muestra advertencia visual
3. Intentar devolver evento a ubicación ocupada
4. Verificar que se previene la devolución

---

## ⚙️ Configuración

### Parámetros de Generación
```typescript
{
  conserveSlots: 3, // Máximo de horas diarias por materia
  minConsecutiveSlots: 2, // Mínimo de horas consecutivas
  distributeEquitably: true, // Distribución equitativa de carga
  preventSingleHourBlocks: true, // Evitar bloques de 1 hora
}
```

### Turnos Predefinidos
```typescript
{
  mañana: [["07:00", "07:45"], ["07:45", "08:30"], ...],
  tarde: [["13:00", "13:45"], ["13:45", "14:30"], ...],
  nocturno: [["16:00", "16:45"], ["16:45", "17:30"], ...]
}
```

---

*Última actualización: 21 de abril de 2026*
