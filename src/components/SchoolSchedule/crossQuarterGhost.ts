// =========================================================================
// Cross-quarter ghost helpers.
// Resuelven el solape calendario entre PNF trimestrales y semestrales.
//
// Calendario asumido:
//   Mes:    1   2   3   |   4   5   6   |   7   8   9
//   Trim:   ←—— T1 ——→  |  ←—— T2 ——→   |  ←—— T3 ——→
//   Sem:    ←———— S1 ————→ ↕ ←———— S2 ————→
//                           ↑ mitad de T2
//
// Periodo(materia) = trimestres calendario que ocupa:
//   Trimestral Q1 → {T1}
//   Trimestral Q2 → {T2}
//   Trimestral Q3 → {T3}
//   Semestral S1  → {T1, T2}
//   Semestral S2  → {T2, T3}
//
// Dos materias entran en conflicto de aula/profesor SSI sus periodos se
// intersectan. Ghost events = eventos de OTROS trimestres cuyo periodo se
// solapa con el del evento en validación, replicados a modo de lock fantasma.
// =========================================================================

import type { Event } from "./fucntions";
import type { Subject } from "../../interfaces/subject";

export type Quarter = "q1" | "q2" | "q3";
export type CalendarTrim = "T1" | "T2" | "T3";

/**
 * Determina el "home quarter" de un subject: el cuarto donde tiene horas > 0.
 * Para semestrales devuelve el primer cuarto con horas (típicamente q1 para S1,
 * q2 o q3 para S2). Para trimestrales, cualquiera con horas > 0 en el orden q1→q3.
 *
 * NOTA: Para trimestrales que se dictan en varios cuartos (ej: q1, q2 y q3 a la vez),
 * el "home" no es único. En ese caso para ghost-matching usamos `getEventPeriod`
 * con el trimestre activo pasado por contexto (vía `inferPeriodFromEvent`).
 */
export function getPrimaryQuarter(subject: Subject | undefined | null): Quarter | null {
  if (!subject || !subject.hours) return null;
  if (subject.hours.q1 && subject.hours.q1 > 0) return "q1";
  if (subject.hours.q2 && subject.hours.q2 > 0) return "q2";
  if (subject.hours.q3 && subject.hours.q3 > 0) return "q3";
  return null;
}

/**
 * Devuelve el set de trimestres calendario que ocupa una materia dada su
 * condición (semestral/trimestral) y su home quarter.
 */
export function getSubjectPeriod(
  isSemestral: boolean,
  homeQuarter: Quarter
): Set<CalendarTrim> {
  if (isSemestral) {
    // S1 = home q1 → {T1, T2}
    // S2 = home q2 o q3 → {T2, T3}
    if (homeQuarter === "q1") return new Set(["T1", "T2"]);
    return new Set(["T2", "T3"]);
  }
  // Trimestral: un solo trimestre calendario
  const map: Record<Quarter, CalendarTrim> = { q1: "T1", q2: "T2", q3: "T3" };
  return new Set([map[homeQuarter]]);
}

/**
 * ¿Dos periodos calendario se intersectan?
 */
export function periodsOverlap(
  a: Set<CalendarTrim>,
  b: Set<CalendarTrim>
): boolean {
  for (const t of a) if (b.has(t)) return true;
  return false;
}

/**
 * Infiere el home quarter y condición semestral de un evento, a partir del
 * subject al que apunta. Si el subject no se encuentra, intenta un fallback
 * conservador: asumir trimestral con el `fallbackQuarter` provisto.
 */
export function inferEventContext(
  event: Event,
  subjects: Subject[] | null | undefined,
  fallbackQuarter: Quarter | null
): { homeQuarter: Quarter; isSemestral: boolean; subject: Subject | null } | null {
  const subjectId = event.extendedProps?.subjectId;
  if (!subjectId) return null;

  const subject = subjects?.find((s) => s.innerId === subjectId) || null;
  if (subject) {
    const home = getPrimaryQuarter(subject);
    if (home) {
      return {
        homeQuarter: home,
        isSemestral: !!subject.isSemestral,
        subject,
      };
    }
  }

  if (fallbackQuarter) {
    return { homeQuarter: fallbackQuarter, isSemestral: false, subject: null };
  }
  return null;
}

/**
 * Dado el conjunto de eventos disponibles (loadedScheduleEvents + eventData +
 * lockedSections aplanadas), el trimestre activo y la lista de subjects,
 * devuelve los ghost events a usar para validación/render.
 *
 * Un evento se considera ghost SSI:
 *   1. Su home quarter es distinto del trimestre activo (no duplicar).
 *   2. Su periodo calendario se solapa con el periodo del subject del evento
 *      Y con alguno de los periodos presentes en el trimestre activo (es decir,
 *      al menos un subject actualmente planificable en `activeTrimestre` podría
 *      colisionar con este ghost).
 *
 * Cada ghost se clona con `isCrossQuarterGhost=true`, `ghostSourceQuarter` y
 * `ghostSourceIsSemestral` para que el resto del sistema lo trate diferenciado.
 *
 * @param lockedSectionsFlat - todos los eventos de lockedSections (todos los trims)
 * @param eventDataCurrent - eventos del trimestre activo (para excluir duplicados)
 */
export function buildCrossQuarterGhostEvents(params: {
  allEvents: Event[];
  lockedSectionsFlat: { key: string; events: Event[] }[];
  eventDataCurrent: Event[];
  subjects: Subject[] | null | undefined;
  activeTrimestre: Quarter;
}): Event[] {
  const { allEvents, lockedSectionsFlat, eventDataCurrent, subjects, activeTrimestre } = params;

  // Evita duplicar eventos que ya están siendo calculados en el trimestre activo
  const currentEventIds = new Set(
    eventDataCurrent.map((e) => eventIdFor(e)).filter((x): x is string => !!x)
  );

  // Determinar los periodos "relevantes": la unión de periodos de cualquier
  // subject con hours[activeTrimestre] > 0. Un ghost es útil solo si su periodo
  // intersecta al menos uno de estos.
  const relevantPeriods = new Set<CalendarTrim>();
  for (const s of subjects || []) {
    const hours = s.hours?.[activeTrimestre];
    if (hours && hours > 0) {
      const period = getSubjectPeriod(!!s.isSemestral, activeTrimestre);
      for (const t of period) relevantPeriods.add(t);
    }
  }
  if (relevantPeriods.size === 0) return [];

  // Pool: loadedScheduleEvents + eventData (solo si pertenecen a OTRO trim)
  //       + lockedSections de otros trimestres (con trim explícito en la key).
  const ghostCandidates: { event: Event; explicitTrim: Quarter | null }[] = [];

  for (const ev of allEvents) {
    if (!ev.extendedProps) continue;
    if (currentEventIds.has(eventIdFor(ev) || "")) continue; // mismo trim, skip
    ghostCandidates.push({ event: ev, explicitTrim: null });
  }
  for (const bucket of lockedSectionsFlat) {
    const trim = parseTrimFromKey(bucket.key);
    if (!trim || trim === activeTrimestre) continue; // mismo trim o no reconocible
    for (const ev of bucket.events) {
      ghostCandidates.push({ event: ev, explicitTrim: trim });
    }
  }

  // Deduplicar candidatos por id
  const seen = new Set<string>();
  const result: Event[] = [];

  for (const { event, explicitTrim } of ghostCandidates) {
    const id = eventIdFor(event);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);

    const ctx = inferEventContext(event, subjects, explicitTrim);
    if (!ctx) continue;
    if (ctx.homeQuarter === activeTrimestre) continue;

    const eventPeriod = getSubjectPeriod(ctx.isSemestral, ctx.homeQuarter);
    if (!periodsOverlap(eventPeriod, relevantPeriods)) continue;

    result.push({
      ...event,
      extendedProps: {
        ...event.extendedProps,
        isCrossQuarterGhost: true,
        ghostSourceQuarter: ctx.homeQuarter,
        ghostSourceIsSemestral: ctx.isSemestral,
      },
    });
  }

  return result;
}

/**
 * ¿El evento `target` (del trimestre activo) entra en conflicto de periodo con
 * el ghost provisto? Se usa en `checkEventConflicts` para validar cross-quarter
 * de forma selectiva (no over-block).
 */
export function doesEventConflictWithGhost(params: {
  targetEvent: Event;
  ghost: Event;
  subjects: Subject[] | null | undefined;
  activeTrimestre: Quarter;
}): boolean {
  const { targetEvent, ghost, subjects, activeTrimestre } = params;

  const targetCtx = inferEventContext(targetEvent, subjects, activeTrimestre);
  if (!targetCtx) return false;

  const ghostHome = ghost.extendedProps?.ghostSourceQuarter;
  const ghostIsSemestral = !!ghost.extendedProps?.ghostSourceIsSemestral;
  if (!ghostHome) return false;

  const targetPeriod = getSubjectPeriod(targetCtx.isSemestral, targetCtx.homeQuarter);
  const ghostPeriod = getSubjectPeriod(ghostIsSemestral, ghostHome);
  return periodsOverlap(targetPeriod, ghostPeriod);
}

// =========================================================================
// Utils privados
// =========================================================================

function eventIdFor(e: Event): string | null {
  if (!e?.extendedProps) return null;
  const day = e.daysOfWeek?.[0];
  const start = e.startTime;
  const subjectId = e.extendedProps.subjectId;
  const seccion = e.extendedProps.seccion;
  const pnfId = e.extendedProps.pnfId;
  if (day == null || !start || !subjectId) return null;
  return `${pnfId}|${subjectId}|${seccion}|${day}|${start}`;
}

function parseTrimFromKey(key: string): Quarter | null {
  if (key.endsWith("-q1")) return "q1";
  if (key.endsWith("-q2")) return "q2";
  if (key.endsWith("-q3")) return "q3";
  return null;
}

/**
 * Elimina los flags ghost (`isCrossQuarterGhost`, etc.) antes de persistir. Se
 * usa al guardar horarios para no contaminar la base de datos con eventos que
 * el sistema ya recalcula en runtime.
 */
export function stripGhostFlags<T extends { extendedProps?: Event["extendedProps"] }>(
  events: T[]
): T[] {
  return events
    .filter((e) => !e.extendedProps?.isCrossQuarterGhost)
    .map((e) => {
      if (!e.extendedProps) return e;
      const {
        isCrossQuarterGhost: _a,
        ghostSourceQuarter: _b,
        ghostSourceIsSemestral: _c,
        ...rest
      } = e.extendedProps;
      void _a;
      void _b;
      void _c;
      return { ...e, extendedProps: rest } as T;
    });
}
