import { Subject } from "../../interfaces/subject";
import { scheduleError } from "./ErrorsModal";
import { normalizeText } from "../../utils/textFilter";

// =====================================================
// Types & Interfaces (unchanged for compatibility)
// =====================================================

export interface Classroom {
  id: string;
  classroom: string;
}

export interface Event {
  title: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  extendedProps: {
    subjectId: string;
    professorId: string | null;
    classroomId: string;
    classroomName: string;
    pnfId: string;
    trayectoId: string;
    seccion: string;
    pnfName: string;
    turnName: string;
    blockId: string;
  };
}

export interface generateScheduleParams {
  subjects: Subject[];
  classrooms: Classroom[];
  trimestre: "q1" | "q2" | "q3";
  unavailableDays?: {
    teacherId: string;
    days: number[];
    hours?: { day: number; start: string; end: string }[];
  }[];
  preferredClassrooms?: {
    subjectKey: string;
    classroomIds: string[];
    subjectName?: string;
    preferLastSlot?: boolean;
    pnfId?: string;
  }[];
  existingEvents?: Event[];
  conserveSlots?: number;
  minConsecutiveSlots?: number;
  preferredConsecutiveSlots?: number;
  setErrors?: (err: scheduleError) => void;
  customDays?: number[];
  customTurnos?: Record<string, [string, string][]>;
  distributeEquitably?: boolean;
  teachers?: any[];
  preventSingleHourBlocks?: boolean;
}

// =====================================================
// Constants
// =====================================================

export const turnos: Record<string, [string, string][]> = {
  mañana: [
    ["07:00", "07:45"],
    ["07:45", "08:30"],
    ["08:40", "09:25"],
    ["09:25", "10:10"],
    ["10:14", "11:00"],
    ["11:00", "11:45"],
  ],
  tarde: [
    ["13:00", "13:45"],
    ["13:45", "14:30"],
    ["14:30", "15:15"],
    ["15:15", "16:00"],
    ["16:00", "16:45"],
    ["16:45", "17:30"],
  ],
  nocturno: [
    ["16:00", "16:45"],
    ["16:45", "17:30"],
    ["17:30", "18:15"],
    ["18:15", "19:00"],
    ["19:00", "19:45"],
    ["19:45", "20:30"],
  ],
  diurno: [
    ["07:00", "07:45"],
    ["07:45", "08:30"],
    ["08:30", "09:15"],
    ["09:15", "10:00"],
    ["10:00", "10:45"],
    ["10:45", "11:30"],
    ["11:30", "12:15"],
    ["12:15", "13:00"],
    ["13:00", "13:45"],
    ["13:45", "14:30"],
    ["14:30", "15:15"],
    ["15:15", "16:00"],
    ["16:00", "16:45"],
  ],
};

// =====================================================
// OccupancyTracker — Efficient conflict detection + undo
// =====================================================

class OccupancyTracker {
  private profSlots = new Set<string>();
  private roomSlots = new Set<string>();
  private secSlots = new Set<string>();
  /** Counts per (subjectId, day) for conserveSlots enforcement */
  private subjectDayCount = new Map<string, number>();

  private pk(day: number, s: string, pid: string) {
    return `P|${day}|${s}|${pid}`;
  }
  private rk(day: number, s: string, rid: string) {
    return `R|${day}|${s}|${rid}`;
  }
  private sk(day: number, s: string, pnf: string, tray: string, sec: string) {
    return `S|${day}|${s}|${pnf}|${tray}|${sec}`;
  }
  private sdk(subId: string, day: number) {
    return `${subId}|${day}`;
  }

  occupy(
    day: number,
    start: string,
    profId: string | null,
    roomId: string,
    pnfId: string,
    trayId: string,
    sec: string,
    subId: string,
  ) {
    if (profId) this.profSlots.add(this.pk(day, start, profId));
    this.roomSlots.add(this.rk(day, start, roomId));
    this.secSlots.add(this.sk(day, start, pnfId, trayId, sec));
    const k = this.sdk(subId, day);
    this.subjectDayCount.set(k, (this.subjectDayCount.get(k) || 0) + 1);
  }

  release(
    day: number,
    start: string,
    profId: string | null,
    roomId: string,
    pnfId: string,
    trayId: string,
    sec: string,
    subId: string,
  ) {
    if (profId) this.profSlots.delete(this.pk(day, start, profId));
    this.roomSlots.delete(this.rk(day, start, roomId));
    this.secSlots.delete(this.sk(day, start, pnfId, trayId, sec));
    const k = this.sdk(subId, day);
    const cur = this.subjectDayCount.get(k) || 0;
    if (cur <= 1) this.subjectDayCount.delete(k);
    else this.subjectDayCount.set(k, cur - 1);
  }

  hasProfConflict(day: number, start: string, profId: string | null): boolean {
    return profId ? this.profSlots.has(this.pk(day, start, profId)) : false;
  }

  hasRoomConflict(day: number, start: string, roomId: string): boolean {
    return this.roomSlots.has(this.rk(day, start, roomId));
  }

  hasSectionConflict(
    day: number,
    start: string,
    pnfId: string,
    trayId: string,
    sec: string,
  ): boolean {
    return this.secSlots.has(this.sk(day, start, pnfId, trayId, sec));
  }

  getSubjectDayHours(subId: string, day: number): number {
    return this.subjectDayCount.get(this.sdk(subId, day)) || 0;
  }
}

// =====================================================
// Internal types for the solver
// =====================================================

interface SubjectTask {
  subject: Subject;
  totalHours: number;
  professorId: string;
  turnoName: string;
  timeSlots: [string, string][];
  availableDays: number[];
  restrictedHours: { day: number; start: string; end: string }[];
  candidateClassrooms: Classroom[];
  effectiveConserveSlots: number;
  effectiveMinConsecutive: number;
  preferLastSlot: boolean;
  constraintScore: number;
  preventSingleHourBlocks: boolean;
}

interface BlockPlacement {
  day: number;
  startSlotIndex: number;
  length: number;
  classroomId: string;
  classroomName: string;
}

// =====================================================
// Block Decomposition
// =====================================================

/**
 * Genera todas las formas válidas de dividir `total` horas en bloques.
 * Ej: total=4, max=3, min=2 → [[2,2]], [[3,1]] (1 < min, pero se incluye como fallback)
 * Se priorizan descomposiciones donde todos los bloques ≥ min.
 */
function generateDecompositions(
  total: number,
  maxPerDay: number,
  minPerBlock: number,
  maxBlocks: number,
  distributeEquitably: boolean,
  preventSingleHourBlocks: boolean = false,
): number[][] {
  // Si preventSingleHourBlocks, el tamaño mínimo de bloque es 2
  const absoluteMinBlockSize = preventSingleHourBlocks ? 2 : 1;

  // Caso especial: si el total es menor que el mínimo de bloque, no hay descomposiciones válidas
  if (total < absoluteMinBlockSize) {
    return [];
  }

  const results: number[][] = [];

  function gen(remaining: number, cur: number[]) {
    if (remaining === 0) {
      results.push([...cur]);
      return;
    }
    if (cur.length >= maxBlocks) return;

    // Si lo que queda es menor que el mínimo de bloque, no podemos formar un bloque válido
    if (remaining < absoluteMinBlockSize) return;

    const maxSize = Math.min(remaining, maxPerDay);
    for (let size = maxSize; size >= absoluteMinBlockSize; size--) {
      // Don't create splits that would leave an impossible remainder
      const after = remaining - size;
      // Si el resto es mayor que 0 pero menor que el mínimo, sería imposible
      if (after > 0 && after < absoluteMinBlockSize) continue;
      if (after > 0 && after > maxPerDay * (maxBlocks - cur.length - 1))
        continue;
      cur.push(size);
      gen(after, cur);
      cur.pop();
    }
  }

  gen(total, []);

  // Deduplicate (sorted form as key)
  const seen = new Set<string>();
  const unique = results.filter((d) => {
    const key = [...d].sort((a, b) => b - a).join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score and sort
  unique.sort((a, b) => {
    // 0. Severely penalize blocks of 1 (user request: only as absolute last resort)
    const aHasOne = a.includes(1) ? 1 : 0;
    const bHasOne = b.includes(1) ? 1 : 0;
    if (aHasOne !== bHasOne) return aHasOne - bHasOne;

    // 1. Prefer all blocks ≥ minPerBlock
    const aAllValid = a.every((x) => x >= minPerBlock) ? 0 : 1;
    const bAllValid = b.every((x) => x >= minPerBlock) ? 0 : 1;
    if (aAllValid !== bAllValid) return aAllValid - bAllValid;

    // 2. Distribution preference
    if (distributeEquitably) {
      if (a.length !== b.length) return b.length - a.length; // more days first
    } else {
      if (a.length !== b.length) return a.length - b.length; // fewer days first
    }

    // 3. Prefer balanced blocks (lower variance)
    const meanA = a.reduce((s, x) => s + x, 0) / a.length;
    const meanB = b.reduce((s, x) => s + x, 0) / b.length;
    const varA = a.reduce((s, x) => s + (x - meanA) ** 2, 0);
    const varB = b.reduce((s, x) => s + (x - meanB) ** 2, 0);
    return varA - varB;
  });

  return unique;
}

// =====================================================
// Placement Finding
// =====================================================

/**
 * Busca todas las colocaciones válidas de un bloque de `blockLen` slots
 * en un día dado, considerando conflictos y restricciones.
 */
function findSlotPlacements(
  day: number,
  blockLen: number,
  task: SubjectTask,
  occupancy: OccupancyTracker,
): Omit<BlockPlacement, "day">[] {
  const {
    timeSlots,
    restrictedHours,
    professorId,
    subject,
    candidateClassrooms,
  } = task;
  const placements: Omit<BlockPlacement, "day">[] = [];

  for (let startIdx = 0; startIdx <= timeSlots.length - blockLen; startIdx++) {
    // Check all slots in the run are free for professor + section
    let runValid = true;
    const slotStarts: string[] = [];

    for (let offset = 0; offset < blockLen; offset++) {
      const [slotStart] = timeSlots[startIdx + offset];
      slotStarts.push(slotStart);

      // Teacher restricted hour?
      if (
        restrictedHours.some((rh) => rh.day === day && rh.start === slotStart)
      ) {
        runValid = false;
        break;
      }
      // Professor busy?
      if (occupancy.hasProfConflict(day, slotStart, professorId)) {
        runValid = false;
        break;
      }
      // Section busy?
      if (
        occupancy.hasSectionConflict(
          day,
          slotStart,
          subject.pnfId,
          subject.trayectoId,
          subject.seccion,
        )
      ) {
        runValid = false;
        break;
      }
    }
    if (!runValid) continue;

    // Try each candidate classroom
    for (const room of candidateClassrooms) {
      let roomOk = true;
      for (const s of slotStarts) {
        if (occupancy.hasRoomConflict(day, s, room.id)) {
          roomOk = false;
          break;
        }
      }
      if (roomOk) {
        placements.push({
          startSlotIndex: startIdx,
          length: blockLen,
          classroomId: room.id,
          classroomName: room.classroom,
        });
      }
    }
  }

  return placements;
}

// =====================================================
// CSP Solver with Backtracking
// =====================================================

/** Global backtrack counter to limit computation */
let backtrackCounter = 0;
const MAX_BACKTRACKS = 2000;

/**
 * Intenta colocar los bloques de una descomposición en los días disponibles.
 * Usa backtracking recursivo para explorar opciones.
 * @returns lista de BlockPlacement si tiene éxito, null si no
 */
function tryPlaceDecomposition(
  decomp: number[],
  blockIdx: number,
  placed: BlockPlacement[],
  task: SubjectTask,
  occupancy: OccupancyTracker,
): BlockPlacement[] | null {
  if (backtrackCounter >= MAX_BACKTRACKS) return null;
  if (blockIdx >= decomp.length) return [...placed];

  const blockLen = decomp[blockIdx];
  const usedDays = new Map<number, BlockPlacement[]>();
  for (const bp of placed) {
    if (!usedDays.has(bp.day)) usedDays.set(bp.day, []);
    usedDays.get(bp.day)!.push(bp);
  }

  // Sort days: prefer unused days first, then days with less load
  const sortedDays = [...task.availableDays].sort((a, b) => {
    const aUsed = usedDays.has(a) ? 1 : 0;
    const bUsed = usedDays.has(b) ? 1 : 0;
    if (aUsed !== bUsed) return aUsed - bUsed;
    const aHours = occupancy.getSubjectDayHours(task.subject.innerId, a);
    const bHours = occupancy.getSubjectDayHours(task.subject.innerId, b);
    return aHours - bHours;
  });

  for (const day of sortedDays) {
    // ENFORCE RULE: Las materias deben verse de corrido y en la misma aula el mismo día.
    // Si ya existe alguna hora de esta materia en este día (ya sea manual o por backtracking),
    // saltamos este día para que el siguiente bloque de la descomposición vaya obligatoriamente a otro día.
    const currentOnDay = occupancy.getSubjectDayHours(
      task.subject.innerId,
      day,
    );
    if (currentOnDay > 0) continue;

    // Verificar el límite máximo por día
    if (blockLen > task.effectiveConserveSlots) continue;

    const slotOptions = findSlotPlacements(day, blockLen, task, occupancy);

    for (const option of slotOptions) {
      const bp: BlockPlacement = { day, ...option };

      // Apply placement
      applyBlock(bp, task, occupancy);
      placed.push(bp);

      // Recurse for next block
      const result = tryPlaceDecomposition(
        decomp,
        blockIdx + 1,
        placed,
        task,
        occupancy,
      );
      if (result) return result;

      // Backtrack
      placed.pop();
      undoBlock(bp, task, occupancy);
      backtrackCounter++;
      if (backtrackCounter >= MAX_BACKTRACKS) return null;
    }
  }

  return null;
}

function applyBlock(
  bp: BlockPlacement,
  task: SubjectTask,
  occ: OccupancyTracker,
) {
  for (let i = 0; i < bp.length; i++) {
    const [start] = task.timeSlots[bp.startSlotIndex + i];
    occ.occupy(
      bp.day,
      start,
      task.professorId,
      bp.classroomId,
      task.subject.pnfId,
      task.subject.trayectoId,
      task.subject.seccion,
      task.subject.innerId,
    );
  }
}

function undoBlock(
  bp: BlockPlacement,
  task: SubjectTask,
  occ: OccupancyTracker,
) {
  for (let i = 0; i < bp.length; i++) {
    const [start] = task.timeSlots[bp.startSlotIndex + i];
    occ.release(
      bp.day,
      start,
      task.professorId,
      bp.classroomId,
      task.subject.pnfId,
      task.subject.trayectoId,
      task.subject.seccion,
      task.subject.innerId,
    );
  }
}

/**
 * Intenta asignar una materia usando todas las descomposiciones posibles.
 * @returns placements si tiene éxito, null si no
 */
function assignTask(
  task: SubjectTask,
  occupancy: OccupancyTracker,
  distributeEquitably = false,
): BlockPlacement[] | null {
  const decomps = generateDecompositions(
    task.totalHours,
    task.effectiveConserveSlots,
    task.effectiveMinConsecutive,
    task.availableDays.length,
    distributeEquitably,
    task.preventSingleHourBlocks,
  );

  for (const decomp of decomps) {
    const result = tryPlaceDecomposition(decomp, 0, [], task, occupancy);
    if (result) return result;
  }

  return null;
}

/**
 * Solver principal con backtracking entre materias.
 * Si una materia no puede asignarse, retrocede hasta `maxDepth` materias previas
 * e intenta colocaciones alternativas.
 */
function solveAll(
  tasks: SubjectTask[],
  occupancy: OccupancyTracker,
  maxDepth: number = 4,
  distributeEquitably = false,
): { assigned: Map<number, BlockPlacement[]>; unassigned: number[] } {
  const assigned = new Map<number, BlockPlacement[]>();
  const assignmentOrder: number[] = []; // stack of indices
  const unassigned: number[] = [];

  let i = 0;
  while (i < tasks.length) {
    if (backtrackCounter >= MAX_BACKTRACKS && !assigned.has(i)) {
      // Budget exhausted, add remaining to unassigned
      unassigned.push(i);
      i++;
      continue;
    }

    const task = tasks[i];
    const placements = assignTask(task, occupancy, distributeEquitably);

    if (placements) {
      assigned.set(i, placements);
      assignmentOrder.push(i);
      i++;
    } else {
      // Try backtracking
      let resolved = false;
      let depth = 0;

      while (
        depth < maxDepth &&
        assignmentOrder.length > 0 &&
        backtrackCounter < MAX_BACKTRACKS
      ) {
        depth++;
        const prevIdx = assignmentOrder.pop()!;
        const prevPlacements = assigned.get(prevIdx)!;
        const prevTask = tasks[prevIdx];

        // Undo previous assignment
        for (const bp of prevPlacements) {
          undoBlock(bp, prevTask, occupancy);
        }
        assigned.delete(prevIdx);

        // Try to assign current task first, then re-assign previous
        const currentPlacements = assignTask(
          task,
          occupancy,
          distributeEquitably,
        );
        if (currentPlacements) {
          assigned.set(i, currentPlacements);

          // Now try to re-assign the previous task
          const prevRetry = assignTask(
            prevTask,
            occupancy,
            distributeEquitably,
          );
          if (prevRetry) {
            assigned.set(prevIdx, prevRetry);
            assignmentOrder.push(prevIdx);
            assignmentOrder.push(i);
            resolved = true;
            i++;
            break;
          } else {
            // Undo current and restore previous
            for (const bp of currentPlacements) {
              undoBlock(bp, task, occupancy);
            }
            assigned.delete(i);

            // Restore previous assignment
            for (const bp of prevPlacements) {
              applyBlock(bp, prevTask, occupancy);
            }
            assigned.set(prevIdx, prevPlacements);
            assignmentOrder.push(prevIdx);
          }
        } else {
          // Restore previous assignment
          for (const bp of prevPlacements) {
            applyBlock(bp, prevTask, occupancy);
          }
          assigned.set(prevIdx, prevPlacements);
          assignmentOrder.push(prevIdx);
        }

        backtrackCounter++;
      }

      if (!resolved) {
        unassigned.push(i);
        i++;
      }
    }
  }

  return { assigned, unassigned };
}

// =====================================================
// Main Entry Point
// =====================================================

/**
 * Motor de generación de horarios basado en CSP con backtracking.
 *
 * Mejoras sobre el enfoque greedy anterior:
 * 1. Backtracking: puede deshacer asignaciones previas para encontrar soluciones válidas
 * 2. Heurística MRV: asigna primero las materias más restringidas
 * 3. Descomposición de bloques: explora múltiples formas de distribuir horas en días
 * 4. Relajación progresiva: solo relaja restricciones cuando es necesario
 * 5. Detección de conflictos O(1) con OccupancyTracker
 *
 * @param params mismos parámetros que antes (retrocompatible)
 * @returns Event[] — lista de eventos individuales por slot (usar mergeConsecutiveEvents para agrupar)
 */
export function generateScheduleEvents({
  subjects,
  classrooms,
  trimestre,
  unavailableDays,
  existingEvents,
  preferredClassrooms,
  conserveSlots = 3,
  minConsecutiveSlots = 2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preferredConsecutiveSlots: _preferredConsecutiveSlots = conserveSlots,
  setErrors = (err) => console.log(err),
  customDays,
  customTurnos,
  distributeEquitably = false,
  teachers = [],
  preventSingleHourBlocks = false,
}: generateScheduleParams): Event[] {
  // Reset global backtrack counter
  backtrackCounter = 0;

  const days = customDays || [1, 2, 3, 4, 5];
  const activeTurnos = customTurnos || turnos;
  const occupancy = new OccupancyTracker();

  // ─── Step 1: Cargar eventos existentes ───
  const existingSubjectHours = new Map<string, number>();

  if (existingEvents?.length) {
    for (const event of existingEvents) {
      if (!event?.extendedProps || !event?.daysOfWeek?.length) continue;

      const day = event.daysOfWeek[0];
      const start = event.startTime;
      const {
        professorId,
        classroomId,
        trayectoId,
        seccion,
        pnfId,
        subjectId,
      } = event.extendedProps;

      // Clave compuesta para contar horas por materia y sección
      const title = event.title;
      if (title && seccion && pnfId && trayectoId) {
        const key = `${title.trim().toLowerCase()}-${seccion}-${pnfId}-${trayectoId}`;
        existingSubjectHours.set(key, (existingSubjectHours.get(key) || 0) + 1);
      }

      // Registrar ocupación
      occupancy.occupy(
        day,
        start,
        professorId,
        classroomId,
        pnfId,
        trayectoId,
        seccion,
        subjectId,
      );
    }
  }

  // ─── Step 2: Filtrar materias y preparar tasks ───
  const filteredSubjects = subjects.filter((sub) => {
    const isQuarterMatch =
      Object.keys(sub.quarter).includes(trimestre) &&
      sub?.hours?.[trimestre] &&
      sub.hours[trimestre]! > 0;
    if (!isQuarterMatch) return false;

    // Calcular cuántas horas faltan por asignar
    const compositeKey = `${sub.subject.trim().toLowerCase()}-${sub.seccion}-${sub.pnfId}-${sub.trayectoId}`;
    const pinnedHours = existingSubjectHours.get(compositeKey) || 0;

    return sub.hours[trimestre]! > pinnedHours;
  });

  const tasks: SubjectTask[] = filteredSubjects
    .map((sub): SubjectTask | null => {
      const compositeKey = `${sub.subject.trim().toLowerCase()}-${sub.seccion}-${sub.pnfId}-${sub.trayectoId}`;
      const pinnedHours = existingSubjectHours.get(compositeKey) || 0;
      const totalHours = sub.hours[trimestre]! - pinnedHours;

      const professorId = sub.quarter[trimestre];
      const turnoName = sub.turnoName?.toLowerCase() || "";
      const subjectKey = normalizeText(sub.subject);

      if (totalHours <= 0 || !professorId) return null;

      // Si preventSingleHourBlocks está activo y solo queda 1 hora, reportar error inmediatamente
      if (preventSingleHourBlocks && totalHours === 1) {
        const teacherObj = teachers?.find((t: any) => t.id === professorId);
        const professorName = teacherObj
          ? `${teacherObj.name} ${teacherObj.lastName}`
          : professorId;

        setErrors({
          name: sub.subject,
          description: `${sub.subject} — Solo necesita 1 hora pero la configuración impide asignar bloques de 1 sola hora. Considere desactivar la restricción o ajustar las horas de la materia.`,
          seccion: sub.seccion,
          year: sub.trayectoName,
          turn: sub.turnoName,
          pnfName: sub.pnf || "",
          professorName,
          trimestre,
        });
        return null;
      }

      const timeSlots = activeTurnos[turnoName];
      if (!timeSlots || timeSlots.length === 0) return null;

      // Restricciones de profesor
      const teacherRest = unavailableDays?.find(
        (r) => r.teacherId === professorId,
      );
      const restrictedDays = teacherRest?.days ?? [];
      const restrictedHours = teacherRest?.hours ?? [];
      const availableDays = days.filter((d) => !restrictedDays.includes(d));

      // Aulas candidatas
      const preferConfig = preferredClassrooms?.find(
        (p) =>
          p.subjectKey === subjectKey && (!p.pnfId || p.pnfId === sub.pnfId),
      );
      const candidateClassrooms = preferConfig?.classroomIds?.length
        ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
        : classrooms;

      if (candidateClassrooms.length === 0 || availableDays.length === 0) {
        // Reportar inmediatamente: sin aulas o sin días
        const teacherObj = teachers?.find((t: any) => t.id === professorId);
        const professorName = teacherObj
          ? `${teacherObj.name} ${teacherObj.lastName}`
          : professorId;

        setErrors({
          name: sub.subject,
          description: `${sub.subject} — ${availableDays.length === 0
            ? `Sin días disponibles (restringidos: ${restrictedDays.join(", ")})`
            : `Sin aulas disponibles${preferConfig ? " (las aulas preferidas no existen)" : ""}`
            }`,
          seccion: sub.seccion,
          year: sub.trayectoName,
          turn: sub.turnoName,
          pnfName: sub.pnf || "",
          professorName,
          trimestre,
        });
        return null;
      }

      // Constraint score: más alto = más restringido = se asigna primero (MRV)
      let score = 0;
      score += (7 - availableDays.length) * 100;
      score += Math.max(0, 20 - candidateClassrooms.length) * 10;
      score += totalHours * 5;
      score += restrictedHours.length * 8;
      score += Math.max(0, 10 - timeSlots.length) * 6;

      return {
        subject: sub,
        totalHours: totalHours,
        professorId,
        turnoName,
        timeSlots: preferConfig?.preferLastSlot
          ? [...timeSlots].reverse()
          : timeSlots,
        availableDays,
        restrictedHours,
        candidateClassrooms,
        effectiveConserveSlots: conserveSlots,
        effectiveMinConsecutive: Math.min(minConsecutiveSlots, totalHours),
        preferLastSlot: preferConfig?.preferLastSlot || false,
        constraintScore: score,
        preventSingleHourBlocks,
      };
    })
    .filter(Boolean) as SubjectTask[];

  // ─── Step 3: Ordenar por constraint score (MRV heuristic) ───
  tasks.sort((a, b) => b.constraintScore - a.constraintScore);

  // ─── Step 4: Resolver con backtracking ───
  const { assigned, unassigned } = solveAll(
    tasks,
    occupancy,
    4,
    distributeEquitably,
  );

  // ─── Step 5: Fase de relajación para materias no asignadas ───
  const stillUnassigned: number[] = [];

  for (const idx of unassigned) {
    const task = tasks[idx];

    // Fase 2: Relajar conserveSlots (permitir más horas por día)
    // IMPORTANTE: preservar preventSingleHourBlocks explícitamente
    const relaxedTask: SubjectTask = {
      ...task,
      effectiveConserveSlots: task.totalHours,
      effectiveMinConsecutive: task.preventSingleHourBlocks ? 2 : 1,
      preventSingleHourBlocks: task.preventSingleHourBlocks,
    };
    const placements = assignTask(relaxedTask, occupancy, distributeEquitably);
    if (placements) {
      assigned.set(idx, placements);
      continue;
    }

    // Fase 3 ELIMINADA: Las restricciones de días/horas del profesor son absolutas.
    // Si no se puede asignar respetando las restricciones del profesor, se reporta error.
    // No se fuerza la asignación en días restringidos.

    stillUnassigned.push(idx);
  }

  // ─── Step 6: Convertir a Event[] ───
  const events: Event[] = [];

  for (const [idx, placements] of assigned.entries()) {
    const task = tasks[idx];
    for (const bp of placements) {
      for (let offset = 0; offset < bp.length; offset++) {
        const [slotStart, slotEnd] = task.timeSlots[bp.startSlotIndex + offset];
        events.push({
          title: task.subject.subject,
          daysOfWeek: [bp.day],
          startTime: slotStart,
          endTime: slotEnd,
          extendedProps: {
            subjectId: task.subject.innerId,
            professorId: task.professorId,
            classroomId: bp.classroomId,
            classroomName: bp.classroomName,
            pnfId: task.subject.pnfId,
            trayectoId: task.subject.trayectoId,
            seccion: task.subject.seccion,
            pnfName: task.subject.pnf,
            turnName: task.subject.turnoName,
            blockId: `${bp.day}-${task.subject.innerId}`,
          },
        });
      }
    }
  }

  // ─── Step 7: Reportar errores ───
  for (const idx of stillUnassigned) {
    const task = tasks[idx];

    const reasons: string[] = [];
    if (task.availableDays.length < days.length) {
      reasons.push(
        `solo ${task.availableDays.length} de ${days.length} días disponibles`,
      );
    }
    if (task.candidateClassrooms.length < classrooms.length) {
      reasons.push(`solo ${task.candidateClassrooms.length} aulas permitidas`);
    }
    if (task.restrictedHours.length > 0) {
      reasons.push(`${task.restrictedHours.length} horas restringidas`);
    }

    if (task.preventSingleHourBlocks) {
      if (task.totalHours === 1) {
        reasons.push("Es una materia de 1 sola hora y la configuración impide asignarla");
      } else {
        reasons.push("La configuración impide asignar bloques de 1 sola hora (no se encontraron suficientes horas continuas)");
      }
    } else {
      reasons.push("horarios y aulas ocupados por otras materias");
    }

    const originalHours = task.subject.hours[trimestre] || task.totalHours;
    const teacherObj = teachers?.find((t: any) => t.id === task.professorId);
    const professorName = teacherObj
      ? `${teacherObj.name} ${teacherObj.lastName}`
      : task.professorId;

    setErrors({
      name: task.subject.subject,
      description: `${task.subject.subject} — No se pudo asignar completamente. (Faltan: ${task.totalHours}h, Total: ${originalHours}h). Razones: ${reasons.join(", ")}`,
      seccion: task.subject.seccion,
      year: task.subject.trayectoName,
      turn: task.subject.turnoName,
      pnfName: task.subject.pnf || "",
      professorName,
      trimestre,
    });
  }

  return events;
}

// =====================================================
// Utility: Merge consecutive events
// =====================================================

/**
 * Agrupa eventos consecutivos con el mismo blockId y mergea sus horarios.
 * @param events lista de eventos a agrupar
 * @returns lista de eventos con horarios mergeados
 */
export function mergeConsecutiveEvents(events: Event[]): Event[] {
  const merged: Event[] = [];

  // Agrupar por blockId
  const grouped = new Map<string, Event[]>();
  for (const event of events) {
    const key = event.extendedProps.blockId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  for (const group of grouped.values()) {
    const sorted = group.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let i = 0;
    while (i < sorted.length) {
      const current = { ...sorted[i] };
      let j = i + 1;

      while (j < sorted.length && sorted[j].startTime === current.endTime) {
        current.endTime = sorted[j].endTime;
        j++;
      }

      merged.push(current);
      i = j;
    }
  }

  return merged;
}
