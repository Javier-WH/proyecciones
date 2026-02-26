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
    trayectoName?: string;
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
  // NOTE: "diurno" is NOT hardcoded here. It is always auto-generated
  // as the union of mañana + tarde in SchoolSchedule.tsx (activeTurnos).
  // This guarantees the hours always match.
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
  hasTeacherRestrictions: boolean;
  hasClassroomRestrictions: boolean;
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
const MAX_BACKTRACKS = 5000;

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
    // Ya no saltamos el día si ya hay horas de esta materia, dejando que maxBlocks 
    // y el orden de días (que prioriza días vacíos) controlen la distribución.

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
  // Cuando el profesor solo tiene 1 día disponible, necesitamos permitir
  // múltiples bloques en ese mismo día (ej: [3,2] para 5 horas con max 3/día).
  // tryPlaceDecomposition ya permite colocar múltiples bloques el mismo día
  // cuando availableDays.length === 1, pero generateDecompositions necesita
  // saber que puede generar decomposiciones con más de 1 bloque.
  // Calculamos cuántos bloques podríamos necesitar como máximo para que quepa la materia.
  // Si tenemos muchas horas y pocos días, o muchos huecos pequeños, necesitamos permitir más bloques.
  // Regla: max(días_disponibles, horas_totales / min_bloque)
  const minBlock = task.preventSingleHourBlocks ? 2 : 1;
  const theoreticalMaxBlocks = Math.ceil(task.totalHours / minBlock);
  const maxBlocks = Math.max(task.availableDays.length, theoreticalMaxBlocks);

  const decomps = generateDecompositions(
    task.totalHours,
    task.effectiveConserveSlots,
    task.effectiveMinConsecutive,
    maxBlocks,
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
 * Backtracking dirigido por profesor.
 * Cuando una materia no se puede colocar y el mismo profesor tiene otras materias
 * ya asignadas, deshace TODAS las del profesor, coloca la materia fallida primero,
 * y luego reasigna las demás.
 *
 * Esto resuelve el caso donde las materias A, B, C del profesor X se colocan
 * sin dejar espacio para la materia D del mismo profesor.
 */
function tryProfessorBacktrack(
  currentIdx: number,
  task: SubjectTask,
  tasks: SubjectTask[],
  assigned: Map<number, BlockPlacement[]>,
  assignmentOrder: number[],
  occupancy: OccupancyTracker,
  distributeEquitably: boolean,
): boolean {
  // Find all previously assigned tasks from the same professor
  const sameProfIndices = assignmentOrder.filter(
    (idx) => tasks[idx].professorId === task.professorId,
  );

  if (sameProfIndices.length === 0) return false;

  // Save all same-professor placements before undoing
  const savedPlacements = new Map<number, BlockPlacement[]>();
  for (const idx of sameProfIndices) {
    savedPlacements.set(idx, assigned.get(idx)!);
    for (const bp of assigned.get(idx)!) {
      undoBlock(bp, tasks[idx], occupancy);
    }
    assigned.delete(idx);
  }

  const sameProfSet = new Set(sameProfIndices);

  // Reset backtrack counter for this sub-problem
  backtrackCounter = 0;

  // Try to assign current task first (professor's other slots are now freed)
  const currentPlacements = assignTask(task, occupancy, distributeEquitably);

  if (currentPlacements) {
    // Current succeeded! Now try to re-assign all other professor tasks
    assigned.set(currentIdx, currentPlacements);
    let allReassigned = true;
    const reassignedIndices: number[] = [];

    // Re-assign professor's other tasks sorted by constraint (most constrained first)
    const sortedSameProf = [...sameProfIndices].sort(
      (a, b) => tasks[b].constraintScore - tasks[a].constraintScore,
    );

    for (const idx of sortedSameProf) {
      backtrackCounter = 0;
      const retry = assignTask(tasks[idx], occupancy, distributeEquitably);
      if (retry) {
        assigned.set(idx, retry);
        reassignedIndices.push(idx);
      } else {
        allReassigned = false;
        break;
      }
    }

    if (allReassigned) {
      // Success! Update assignment order: remove same-prof, add them back + current
      const filtered = assignmentOrder.filter((idx) => !sameProfSet.has(idx));
      assignmentOrder.length = 0;
      assignmentOrder.push(...filtered, ...sortedSameProf, currentIdx);
      return true;
    }

    // Failed — undo current task and any re-assigned tasks
    for (const bp of currentPlacements) {
      undoBlock(bp, task, occupancy);
    }
    assigned.delete(currentIdx);

    for (const idx of reassignedIndices) {
      for (const bp of assigned.get(idx)!) {
        undoBlock(bp, tasks[idx], occupancy);
      }
      assigned.delete(idx);
    }
  }

  // Restore all original placements
  for (const [idx, pls] of savedPlacements) {
    for (const bp of pls) {
      applyBlock(bp, tasks[idx], occupancy);
    }
    assigned.set(idx, pls);
  }

  return false;
}

/**
 * Solver principal con backtracking entre materias.
 * Si una materia no puede asignarse, retrocede hasta `maxDepth` materias previas
 * e intenta colocaciones alternativas.
 * Si eso falla, intenta backtracking dirigido por profesor.
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
    // Reset backtrack counter per task so each task gets its own budget.
    // Without this, restricted tasks could exhaust the budget and cause
    // unrestricted tasks to be skipped even when obvious placements exist.
    backtrackCounter = 0;

    const task = tasks[i];
    const placements = assignTask(task, occupancy, distributeEquitably);

    if (placements) {
      assigned.set(i, placements);
      assignmentOrder.push(i);
      i++;
    } else {
      // Try standard backtracking (last maxDepth tasks)
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

      // If standard backtracking failed, try professor-targeted backtracking
      if (!resolved) {
        backtrackCounter = 0;
        resolved = tryProfessorBacktrack(
          i,
          task,
          tasks,
          assigned,
          assignmentOrder,
          occupancy,
          distributeEquitably,
        );
        if (resolved) {
          i++;
        }
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

  // ─── Build set of reserved classrooms ───
  // Classrooms that are explicitly assigned to specific subjects
  // via subject restrictions should be deprioritized for other subjects
  const reservedClassroomIds = new Set<string>();
  if (preferredClassrooms) {
    for (const pref of preferredClassrooms) {
      if (pref.classroomIds?.length) {
        for (const id of pref.classroomIds) {
          reservedClassroomIds.add(id);
        }
      }
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
          description: `Esta materia solo tiene 1 hora asignada en el trimestre, pero está activada la opción "Evitar bloques de 1 sola hora". Para solucionarlo: desactive esa opción en la Configuración (⚙️), o aumente las horas de esta materia a 2 o más.`,
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
      // IMPORTANTE: Primero buscar restricción con pnfId exacto, luego genérica sin pnfId
      // Esto evita que una restricción genérica (sin pnfId) se aplique en lugar de
      // la restricción específica del PNF correcto.
      const preferConfig =
        preferredClassrooms?.find(
          (p) => p.subjectKey === subjectKey && p.pnfId === sub.pnfId,
        ) ??
        preferredClassrooms?.find(
          (p) => p.subjectKey === subjectKey && !p.pnfId,
        );

      // Para materias CON restricción de aula: solo usar las aulas asignadas
      // Para materias SIN restricción: usar todas, pero deprioritizar las reservadas
      // para que no le quiten aulas a las materias que SÍ las necesitan
      const candidateClassrooms = preferConfig?.classroomIds?.length
        ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
        : [...classrooms].sort((a, b) => {
          const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0;
          const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0;
          return aReserved - bReserved;
        });

      if (candidateClassrooms.length === 0 || availableDays.length === 0) {
        // Reportar inmediatamente: sin aulas o sin días
        const teacherObj = teachers?.find((t: any) => t.id === professorId);
        const professorName = teacherObj
          ? `${teacherObj.name} ${teacherObj.lastName}`
          : professorId;

        const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
        const restrictedDayNames = restrictedDays.map((d: number) => dayNames[d] || `Día ${d}`).join(", ");

        let errorDesc = "";
        if (availableDays.length === 0) {
          errorDesc = `El profesor tiene restringidos todos los días hábiles (${restrictedDayNames}), por lo que no hay ningún día disponible para asignar esta materia. Para solucionarlo: edite las restricciones del profesor y habilite al menos un día.`;
        } else {
          errorDesc = preferConfig
            ? `Las aulas asignadas como preferidas para esta materia no están disponibles o no existen. Para solucionarlo: revise las restricciones de aulas de esta materia y seleccione aulas válidas.`
            : `No hay aulas disponibles para asignar esta materia. Para solucionarlo: agregue más aulas en el sistema.`;
        }

        setErrors({
          name: sub.subject,
          description: errorDesc,
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
      // PRIORIDAD PRINCIPAL: restricciones de profesor (días disponibles)
      // Un profesor con 1 día disponible DEBE colocarse antes que uno con 5 días
      let score = 0;

      // Factor dominante: días disponibles del profesor
      // Escala exponencial para que las restricciones más severas tengan prioridad abrumadora
      // 1 día disponible → 1000pts, 2 días → 500pts, 3 días → 333pts, 5 días → 200pts
      const dayRestrictionScore = availableDays.length > 0
        ? Math.round(1000 / availableDays.length)
        : 2000; // Sin días = máxima urgencia (se reportará error)
      score += dayRestrictionScore;

      // Horas restringidas del profesor (slots específicos bloqueados)
      // Cada hora restringida reduce significativamente las opciones
      score += restrictedHours.length * 50;

      // Factor secundario: ratio horas/días — cuánto "aprieta" la materia
      // Un profesor con 1 día disponible y 6 horas necesarias es CRÍTICO
      // 6h / 1d -> 6 * 100 = 600pts
      // 2h / 5d -> 0.4 * 100 = 40pts
      if (availableDays.length > 0) {
        const hoursPerAvailableDay = totalHours / availableDays.length;
        score += Math.round(hoursPerAvailableDay * 100);
      }

      // Factor importante: pocas aulas candidatas
      // Una materia con 1 sola aula posible es MUY restringida
      // 1 aula → 190pts, 2 aulas → 90pts, 5 aulas → 30pts
      if (candidateClassrooms.length <= 3) {
        score += Math.round(200 / candidateClassrooms.length);
      } else {
        score += Math.max(0, 20 - candidateClassrooms.length) * 5;
      }

      // Factor menor: horas totales (materias con más horas ligeramente más urgentes)
      score += totalHours * 3;

      // Factor menor: pocos slots en el turno
      score += Math.max(0, 10 - timeSlots.length) * 4;

      // Indicadores de restricciones
      const hasTeacherRestrictions = restrictedDays.length > 0 || restrictedHours.length > 0;
      const hasClassroomRestrictions = !!(preferConfig?.classroomIds?.length);

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
        hasTeacherRestrictions,
        hasClassroomRestrictions,
      };
    })
    .filter(Boolean) as SubjectTask[];

  // ─── Step 3: Ordenar por prioridad de restricciones ───
  // ESTRATEGIA: Las materias con cualquier tipo de restricción van PRIMERO,
  // ordenadas de más restringido a menos restringido.
  // Dentro del mismo nivel de restricción, se agrupan por profesor.
  tasks.sort((a, b) => {
    // Nivel 1: Materias con CUALQUIER restricción antes que sin restricciones
    const aHasRestrictions = a.hasTeacherRestrictions || a.hasClassroomRestrictions;
    const bHasRestrictions = b.hasTeacherRestrictions || b.hasClassroomRestrictions;
    if (aHasRestrictions !== bHasRestrictions) {
      return aHasRestrictions ? -1 : 1;
    }

    // Nivel 1.5: Dentro de restringidos, priorizar los que tienen AMBOS tipos
    if (aHasRestrictions && bHasRestrictions) {
      const aBoth = (a.hasTeacherRestrictions && a.hasClassroomRestrictions) ? 1 : 0;
      const bBoth = (b.hasTeacherRestrictions && b.hasClassroomRestrictions) ? 1 : 0;
      if (aBoth !== bBoth) return bBoth - aBoth;
    }

    // Nivel 2: Dentro de la misma categoría, ordenar por constraintScore (más alto primero)
    if (a.constraintScore !== b.constraintScore) {
      return b.constraintScore - a.constraintScore;
    }

    // Nivel 3: A igual score, agrupar materias del mismo profesor juntas
    // para que se asignen consecutivamente y no se bloqueen entre sí
    if (a.professorId !== b.professorId) {
      return a.professorId.localeCompare(b.professorId);
    }

    // Nivel 4: Desempate determinista por ID único de materia
    // Garantiza que el orden sea siempre el mismo independientemente del orden de llegada de los datos
    return (a.subject.innerId || "").localeCompare(b.subject.innerId || "");
  });

  // ─── Step 4: Resolver con backtracking ───
  let { assigned, unassigned } = solveAll(
    tasks,
    occupancy,
    10,
    distributeEquitably,
  );

  // ─── Step 4b: Re-solve con prioridad invertida ───
  // Si hay materias sin asignar, intentar un segundo solve completo
  // poniendo las materias fallidas al frente (máxima prioridad).
  // Esto resuelve casos donde el orden inicial bloquea espacios que
  // las materias más restringidas necesitan.
  if (unassigned.length > 0) {
    // Guardar el resultado actual
    const prevAssigned = new Map(assigned);
    const prevUnassignedCount = unassigned.length;

    // Deshacer todas las asignaciones del primer intento
    for (const [idx, placements] of prevAssigned.entries()) {
      for (const bp of placements) {
        undoBlock(bp, tasks[idx], occupancy);
      }
    }

    // Crear nuevo orden: materias fallidas primero, luego el resto en orden original
    const unassignedSet = new Set(unassigned);
    const reorderedIndices = [
      ...unassigned, // Primero las que fallaron
      ...tasks.map((_, i) => i).filter(i => !unassignedSet.has(i)), // Luego las demás
    ];

    // Crear array de tasks reordenado
    const reorderedTasks = reorderedIndices.map(i => tasks[i]);

    // Re-solve con el nuevo orden
    backtrackCounter = 0;
    const retry = solveAll(reorderedTasks, occupancy, 12, distributeEquitably);

    // Mapear los índices de vuelta al array original
    const retryAssigned = new Map<number, BlockPlacement[]>();
    for (const [retryIdx, placements] of retry.assigned.entries()) {
      retryAssigned.set(reorderedIndices[retryIdx], placements);
    }
    const retryUnassigned = retry.unassigned.map(retryIdx => reorderedIndices[retryIdx]);

    // ¿El segundo intento es mejor?
    if (retryUnassigned.length < prevUnassignedCount) {
      // Usar el resultado del segundo intento
      assigned = retryAssigned;
      unassigned = retryUnassigned;
    } else {
      // El primer intento era igual o mejor: restaurar
      // Primero deshacer el segundo intento
      for (const [retryIdx, placements] of retry.assigned.entries()) {
        for (const bp of placements) {
          undoBlock(bp, reorderedTasks[retryIdx], occupancy);
        }
      }
      // Restaurar el primer intento
      for (const [idx, placements] of prevAssigned.entries()) {
        for (const bp of placements) {
          applyBlock(bp, tasks[idx], occupancy);
        }
      }
      assigned = prevAssigned;
    }
  }

  // ─── Step 5: Fase de relajación para materias no asignadas ───
  const stillUnassigned: number[] = [];

  // Ordenar unassigned: materias más pequeñas primero para maximizar
  // cuántas materias caben (estrategia greedy por tamaño)
  const sortedUnassigned = [...unassigned].sort(
    (a, b) => tasks[a].totalHours - tasks[b].totalHours,
  );

  for (const idx of sortedUnassigned) {
    const task = tasks[idx];

    // Reset backtrack counter para cada intento de relajación
    backtrackCounter = 0;

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

  // ─── Step 5b: Asignación parcial para materias que no caben completas ───
  // Si una materia necesita 5 horas pero solo caben 2, asignar las 2 que caben
  // y reportar las 3 restantes como error.
  const finalUnassigned: number[] = [];
  const partialAssignments = new Map<number, { placed: number; total: number }>();

  for (const idx of stillUnassigned) {
    const task = tasks[idx];
    const minBlock = task.preventSingleHourBlocks ? 2 : 1;
    let placed = false;

    // Intentar con horas decrecientes: totalHours-1, totalHours-2, ..., minBlock
    for (let tryHours = task.totalHours - 1; tryHours >= minBlock; tryHours--) {
      // Don't leave exactly 1 remaining hour if preventSingleHourBlocks is active,
      // because that orphaned hour can never be placed. E.g., 5 total, placing 4
      // leaves 1 (bad). Place 3 instead (leaves 2, which is a valid block).
      const remaining = task.totalHours - tryHours;
      if (task.preventSingleHourBlocks && remaining > 0 && remaining < 2) {
        continue;
      }

      backtrackCounter = 0;

      const partialTask: SubjectTask = {
        ...task,
        totalHours: tryHours,
        effectiveConserveSlots: tryHours,
        effectiveMinConsecutive: minBlock,
      };

      const placements = assignTask(partialTask, occupancy, distributeEquitably);
      if (placements) {
        assigned.set(idx, placements);
        partialAssignments.set(idx, { placed: tryHours, total: task.totalHours });
        placed = true;
        break;
      }
    }

    if (!placed) {
      finalUnassigned.push(idx);
    }
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
            trayectoName: task.subject.trayectoName,
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
  const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // Reportar errores para materias completamente no asignadas
  for (const idx of finalUnassigned) {
    const task = tasks[idx];
    const originalHours = task.subject.hours[trimestre] || task.totalHours;
    const teacherObj = teachers?.find((t: any) => t.id === task.professorId);
    const professorName = (teacherObj && !teacherObj.is_placeholder)
      ? `${teacherObj.name} ${teacherObj.lastName}`
      : "Sin Profesor Asignado";

    // Construir descripción clara del problema y sugerencia de solución
    const availableDayNames = task.availableDays.map((d: number) => dayNames[d] || `Día ${d}`).join(", ");
    const problems: string[] = [];
    const suggestions: string[] = [];

    // Problema: pocos días disponibles
    if (task.availableDays.length < days.length) {
      const restrictedDayNames = days
        .filter(d => !task.availableDays.includes(d))
        .map((d: number) => dayNames[d] || `Día ${d}`)
        .join(", ");
      problems.push(`El profesor solo puede dar clases los: ${availableDayNames} (tiene restringidos: ${restrictedDayNames})`);
      suggestions.push(`Revise las restricciones del profesor y habilite más días`);
    }

    // Problema: pocas aulas
    if (task.candidateClassrooms.length < classrooms.length && task.candidateClassrooms.length <= 2) {
      const classroomNames = task.candidateClassrooms.map(c => c.classroom).join(", ");
      problems.push(`Solo puede usar las aulas: ${classroomNames}`);
      suggestions.push(`Agregue más aulas permitidas para esta materia en las restricciones de materias`);
    }

    // Problema: horas restringidas
    if (task.restrictedHours.length > 0) {
      problems.push(`El profesor tiene ${task.restrictedHours.length} horas específicas restringidas`);
      suggestions.push(`Revise las horas restringidas del profesor`);
    }

    // Problema: bloques de 1 hora
    if (task.preventSingleHourBlocks) {
      problems.push(`La opción \"Evitar bloques de 1 hora\" está activa y no se encontró espacio para bloques de 2+ horas consecutivas`);
      suggestions.push(`Desactive la opción en Configuración (⚙️) o libere más espacio en el horario`);
    }

    // Si no hay problemas específicos, es un conflicto general de espacio
    if (problems.length === 0) {
      problems.push(`Todas las aulas y horarios disponibles ya están ocupados por otras materias`);
      suggestions.push(`Agregue más aulas o ajuste las horas de otras materias para liberar espacio`);
    }

    const description = [
      `No se pudo asignar: faltan ${task.totalHours} de ${originalHours} horas.`,
      ``,
      `⚠️ Problema: ${problems.join(". ")}`,
      ``,
      `💡 Sugerencia: ${suggestions.join(". ")}`,
    ].join("\n");

    setErrors({
      name: task.subject.subject,
      description,
      seccion: task.subject.seccion,
      year: task.subject.trayectoName,
      turn: task.subject.turnoName,
      pnfName: task.subject.pnf || "",
      professorName,
      trimestre,
      subjectId: task.subject.innerId,
      professorId: task.professorId,
      trayectoId: task.subject.trayectoId,
      pnfId: task.subject.pnfId,
      totalHours: task.totalHours,
    });
  }

  // Reportar errores para materias parcialmente asignadas
  for (const [idx, partial] of partialAssignments.entries()) {
    const task = tasks[idx];
    const teacherObj = teachers?.find((t: any) => t.id === task.professorId);
    const professorName = (teacherObj && !teacherObj.is_placeholder)
      ? `${teacherObj.name} ${teacherObj.lastName}`
      : "Sin Profesor Asignado";

    const remaining = partial.total - partial.placed;
    const availableDayNames = task.availableDays.map((d: number) => dayNames[d] || `Día ${d}`).join(", ");

    const description = [
      `⚠️ Asignación parcial: se asignaron ${partial.placed} de ${partial.total} horas. Faltan ${remaining} horas.`,
      ``,
      `El profesor solo puede dar clases los: ${availableDayNames}, y no hay suficiente espacio disponible para todas las horas.`,
      ``,
      `💡 Sugerencia: Habilite más días para el profesor, agregue más aulas, o redistribuya otras materias para liberar espacio.`,
    ].join("\n");

    setErrors({
      name: task.subject.subject,
      description,
      seccion: task.subject.seccion,
      year: task.subject.trayectoName,
      turn: task.subject.turnoName,
      pnfName: task.subject.pnf || "",
      professorName,
      trimestre,
      subjectId: task.subject.innerId,
      professorId: task.professorId,
      trayectoId: task.subject.trayectoId,
      pnfId: task.subject.pnfId,
      totalHours: remaining,
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
