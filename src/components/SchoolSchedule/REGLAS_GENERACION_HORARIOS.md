# Reglas de Hierro para la Generación de Horarios

> **⚠️ OBLIGATORIO:** Cualquier persona o agente que modifique la función `generateScheduleEvents`  
> o cualquier función auxiliar (`tryPlaceDecomposition`, `assignTask`, `generateDecompositions`,  
> `findSlotPlacements`, `solveAll`, fase de relajación, asignación parcial) **DEBE** leer y  
> respetar TODAS estas reglas. **No hay excepciones.**

---

## Regla 1: Máximo de Horas Diarias por Materia (ABSOLUTO)

El parámetro `conserveSlots` (por defecto 3) define el **máximo absoluto** de horas que una  
materia puede tener en un solo día.

### ❌ PROHIBIDO
- Usar `Math.max(conserveSlots, ceil(totalHours / availableDays))` o cualquier lógica que  
  permita **superar** el límite cuando el profesor tiene pocos días disponibles.
- En la fase de relajación: asignar `effectiveConserveSlots = task.totalHours` (esto elimina  
  el límite completamente).
- En la asignación parcial: asignar `effectiveConserveSlots = tryHours` sin hacer  
  `Math.min(tryHours, task.effectiveConserveSlots)`.

### ✅ CORRECTO
```typescript
// En tryPlaceDecomposition:
const maxAllowedOnDay = task.effectiveConserveSlots; // SIEMPRE usar el límite configurado

// En la fase de relajación:
effectiveConserveSlots: task.effectiveConserveSlots  // MANTENER el límite original

// En la asignación parcial:
effectiveConserveSlots: Math.min(tryHours, task.effectiveConserveSlots)
```

### Consecuencia si no cabe
Si un profesor tiene 1 día disponible y la materia requiere 5 horas con límite de 3,  
**se reporta error**. NO se fuerza poniendo 5 horas en un día.

---

## Regla 2: No Repetir Materia en Bloques No Consecutivos el Mismo Día

Una materia **jamás** puede aparecer dos veces en el mismo día en horarios separados  
(ej: 07:00-08:30 por la mañana y 13:00-14:30 por la tarde).

### ❌ PROHIBIDO
- Permitir que `tryPlaceDecomposition` coloque dos bloques de la misma materia en el  
  mismo día sin verificar que sean **adyacentes** (contiguos en slots).
- Una descomposición como `[2, 2]` que coloque bloques en slots 0-1 y 4-5 del mismo día.

### ✅ CORRECTO
Si un día ya tiene un bloque de esta materia en los slots [startIdx, startIdx+length):
- El nuevo bloque **solo** puede colocarse inmediatamente antes (`newEnd === existingMinSlot`)  
  o inmediatamente después (`newStart === existingMaxSlotEnd`).

```typescript
// En tryPlaceDecomposition, si ya hay bloques este día:
const existingBlocksThisDay = placed.filter(p => p.day === day);
if (existingBlocksThisDay.length > 0) {
  // Calcular rango existente
  // Filtrar opciones para que solo sean adyacentes
  slotOptions.filter(option => {
    return newEnd === existingMinSlot || newStart === existingMaxSlotEnd;
  });
}
```

---

## Regla 3: Las Restricciones del Profesor Son Absolutas

Los días y horas restringidos del profesor **nunca** se relajan.

### ❌ PROHIBIDO
- Crear una "Fase 3 de relajación" que ignore las restricciones del profesor.
- Forzar la asignación de una materia en un día restringido del profesor.

### ✅ CORRECTO
Si no cabe respetando las restricciones del profesor, se reporta error al usuario  
con sugerencias claras (habilitar más días, agregar más aulas, etc.).

---

## Regla 4: Consistencia de `blockId`

El `blockId` usado para agrupar eventos debe ser **único por materia+día**.  
El formato actual es `${bp.day}-${task.subject.innerId}`.

Esto implica que si hay bloques contiguos en el mismo día, se merge correctamente  
en `mergeConsecutiveEvents`. Los bloques no contiguos del mismo día producirían  
un merge incorrecto, razón adicional por la que la Regla 2 existe.

---

## Regla 5: La Fase de Relajación Solo Relaja el Mínimo Consecutivo

La fase de relajación (Step 5) existe para materias que no pudieron ser asignadas  
en el primer intento. Solo debe relajar `effectiveMinConsecutive` (permitir bloques  
más pequeños, ej: de 2 a 1), **nunca** relajar `effectiveConserveSlots` (máximo por día).

---

## Regla 6: La Asignación Parcial Respeta Todas las Reglas

La asignación parcial (Step 5b) intenta colocar un subconjunto de las horas  
cuando no caben todas. Las reglas 1, 2, 3 **siguen aplicando** en este modo.

---

## Resumen de Puntos de Código Críticos

| Archivo | Función | Qué verificar |
|---------|---------|---------------|
| `fucntions.tsx` | `tryPlaceDecomposition` | `maxAllowedOnDay = task.effectiveConserveSlots` (Regla 1) |
| `fucntions.tsx` | `tryPlaceDecomposition` | Bloques adyacentes si ya hay bloques del mismo subject en el día (Regla 2) |
| `fucntions.tsx` | Fase de relajación (Step 5) | `effectiveConserveSlots` NO se cambia a `totalHours` (Regla 5) |
| `fucntions.tsx` | Asignación parcial (Step 5b) | `Math.min(tryHours, task.effectiveConserveSlots)` (Regla 6) |
| `fucntions.tsx` | `findSlotPlacements` | Respeta restricciones de profesor (Regla 3) |

---

## Checklist Antes de Hacer Commit

- [ ] `maxAllowedOnDay` solo usa `effectiveConserveSlots`, no `Math.max(...)` con otras cosas.
- [ ] `tryPlaceDecomposition` verifica adyacencia cuando ya hay bloques del mismo subject en un día.
- [ ] La fase de relajación no modifica `effectiveConserveSlots`.
- [ ] La asignación parcial usa `Math.min(tryHours, effectiveConserveSlots)`.
- [ ] Las restricciones del profesor (días y horas) nunca se ignoran.
- [ ] No se introduce ningún nuevo `Math.max` que pueda sobrepasar el límite diario.

---

*Última actualización: 2026-03-02*  
*Motivo: Estos bugs se repitieron múltiples veces. Este documento existe para evitar regresiones.*
