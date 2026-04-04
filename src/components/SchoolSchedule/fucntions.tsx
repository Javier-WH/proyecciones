import { Subject } from "../../interfaces/subject";
import { scheduleError } from "./ErrorsModal";
import { normalizeText } from "../../utils/textFilter";

import { ClassroomOverride } from "../../fetch/schedule/classroomOverrideFetch";

// =====================================================
// Types & Interfaces (unchanged for compatibility)
// =====================================================

export interface Classroom {
  id: string;
  classroom: string;
  active?: boolean;
  exclusive?: boolean;
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
    isExclusive?: boolean;
    splitHours?: boolean;
  }[];
  classroomOverrides?: ClassroomOverride[];
  conserveSlots?: number;
  minConsecutiveSlots?: number;
  preferredConsecutiveSlots?: number;
  setErrors?: (err: scheduleError) => void;
  customDays?: number[];
  customTurnos?: Record<string, [string, string][]>;
  distributeEquitably?: boolean;
  teachers?: any[];
  preventSingleHourBlocks?: boolean;
  breaks?: { start: string; end: string }[];
  lockedEvents?: Event[];
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
  /** Exact start times per (subjectId, day) for cross-task adjacency enforcement */
  private subjectDayStartTimes = new Map<string, string[]>();

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
    // Track exact start time for cross-task adjacency enforcement
    if (!this.subjectDayStartTimes.has(k)) this.subjectDayStartTimes.set(k, []);
    this.subjectDayStartTimes.get(k)!.push(start);
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
    // Release exact start time
    const starts = this.subjectDayStartTimes.get(k);
    if (starts) {
      const idx = starts.indexOf(start);
      if (idx >= 0) starts.splice(idx, 1);
      if (starts.length === 0) this.subjectDayStartTimes.delete(k);
    }
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

  /** Returns all start times recorded for a subject on a given day (across ALL tasks) */
  getSubjectDayStartTimes(subId: string, day: number): string[] {
    return this.subjectDayStartTimes.get(this.sdk(subId, day)) || [];
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
  isClassroomExclusive: boolean;
  breaks?: { start: string; end: string }[];
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
    breaks,
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

      // Crosses a break restriction?
      if (offset > 0 && breaks && breaks.length > 0) {
        const prevEnd = timeSlots[startIdx + offset - 1][1];
        const currentStart = slotStart;
        if (breaks.some((b) => prevEnd <= b.start && currentStart >= b.end)) {
          runValid = false;
          break;
        }
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
const MAX_BACKTRACKS = 20000;

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
    // ═══════════════════════════════════════════════════════════════════
    // REGLA DE HIERRO 1: El límite máximo de horas por día (conserveSlots)
    // es ABSOLUTO. Nunca se puede exceder, sin importar cuántos días
    // tenga disponible el profesor. Si el profesor tiene pocos días y
    // no caben todas las horas, se reporta error (NO se sobrepasa).
    // ═══════════════════════════════════════════════════════════════════
    const currentHours = occupancy.getSubjectDayHours(task.subject.innerId, day);
    const maxAllowedOnDay = task.effectiveConserveSlots;

    if (currentHours + blockLen > maxAllowedOnDay) continue;

    // ═══════════════════════════════════════════════════════════════════
    // REGLA DE HIERRO 2: Una misma materia NO puede aparecer en bloques
    // no consecutivos el mismo día. Esto aplica GLOBALMENTE: se consulta
    // el OccupancyTracker (que contiene bloques de TODAS las tasks,
    // incluyendo tasks separadas por splitHours o classroomOverrides).
    // Si ya hay slots de esta materia en este día, el nuevo bloque
    // DEBE ser contiguo (adyacente) a los existentes.
    // ═══════════════════════════════════════════════════════════════════
    const allSlotOptions = findSlotPlacements(day, blockLen, task, occupancy);

    // Consultar el occupancy tracker para obtener TODOS los start times
    // de esta materia en este día (incluye bloques de otras tasks Y
    // bloques ya placed por esta task, ya que applyBlock los registra)
    const existingStartTimes = occupancy.getSubjectDayStartTimes(task.subject.innerId, day);

    let slotOptions = allSlotOptions;

    if (existingStartTimes.length > 0) {
      // Mapear los start times absolutos a índices de slot en el timeSlots de esta task
      const existingIndices: number[] = [];
      for (const t of existingStartTimes) {
        const idx = task.timeSlots.findIndex(s => s[0] === t);
        if (idx >= 0) existingIndices.push(idx);
      }

      if (existingIndices.length > 0) {
        existingIndices.sort((a, b) => a - b);
        const existingMin = existingIndices[0];
        // El último índice + 1 = fin exclusivo del rango ocupado
        const existingMaxEnd = existingIndices[existingIndices.length - 1] + 1;

        // Filtrar: solo opciones adyacentes al rango existente
        slotOptions = allSlotOptions.filter(option => {
          const newEnd = option.startSlotIndex + option.length;
          // Adyacente por arriba: el nuevo bloque termina justo donde empieza el existente
          // Adyacente por abajo: el nuevo bloque empieza justo donde termina el existente
          return newEnd === existingMin || option.startSlotIndex === existingMaxEnd;
        });
      }
    }

    for (const option of slotOptions) {
      const bp: BlockPlacement = { day, ...option };
      applyBlock(bp, task, occupancy);
      placed.push(bp);

      const result = tryPlaceDecomposition(decomp, blockIdx + 1, placed, task, occupancy);
      if (result) return result;

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
  preferredClassrooms,
  classroomOverrides,
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
  breaks = [],
  lockedEvents = [],
}: generateScheduleParams): Event[] {
  // Reset global backtrack counter
  backtrackCounter = 0;

  const days = customDays || [1, 2, 3, 4, 5];
  const activeTurnos = customTurnos || turnos;
  const occupancy = new OccupancyTracker();

  // ─── Pre-occupy locked events ───
  if (lockedEvents.length > 0) {
    const reportedLockedErrors = new Set<string>();

    for (const evt of lockedEvents) {
      if (evt.daysOfWeek?.length && evt.startTime && evt.extendedProps) {
        const day = evt.daysOfWeek[0];
        const professorId = evt.extendedProps.professorId;
        const turnName = evt.extendedProps.turnName?.toLowerCase() || "";
        const timeSlots = activeTurnos[turnName] || [];

        // Find start and end indices in the slots array
        const startIdx = timeSlots.findIndex(s => s[0] === evt.startTime);
        const endIdx = timeSlots.findIndex(s => s[1] === evt.endTime);

        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            occupancy.occupy(
              day,
              timeSlots[i][0],
              professorId,
              evt.extendedProps.classroomId,
              evt.extendedProps.pnfId,
              evt.extendedProps.trayectoId,
              evt.extendedProps.seccion,
              evt.extendedProps.subjectId
            );
          }
        } else {
          // Fallback if slot matching fails for some reason
          occupancy.occupy(
            day,
            evt.startTime,
            professorId,
            evt.extendedProps.classroomId,
            evt.extendedProps.pnfId,
            evt.extendedProps.trayectoId,
            evt.extendedProps.seccion,
            evt.extendedProps.subjectId
          );
        }

        // --- VALIDACIONES DE SECCIÓN CONGELADA ---
        const teacherObj = teachers?.find((t: any) => t.id === professorId);
        const professorName = teacherObj
          ? `${teacherObj.name} ${teacherObj.lastName}`
          : professorId;

        // Base key for tracking duplicates per section
        const baseErrKey = `${evt.extendedProps.subjectId}-${evt.extendedProps.seccion}-${evt.extendedProps.trayectoId}`;

        // 1. (ELIMINADO) Validar restricciones de disponibilidad del profesor.
        // Se ha suprimido esta validación para las secciones congeladas porque:
        // Si el event está congelado es porque el usuario/generador forzó que fuese correcto.
        // Alertar aquí generaba una contradicción fantasma si los días difieren.

        // 2. Validar restricciones exclusivas de aula
        const subjectNorm = normalizeText(evt.title);
        const trayectoNorm = normalizeText(evt.extendedProps.trayectoName || "");
        const subjectKey = `${subjectNorm}_t_${trayectoNorm}`;

        const preferConfig =
          preferredClassrooms?.find(
            (p) => p.subjectKey === subjectKey && p.pnfId === evt.extendedProps!.pnfId,
          ) ??
          preferredClassrooms?.find(
            (p) => p.subjectKey === subjectKey && !p.pnfId,
          );

        if (preferConfig && preferConfig.isExclusive && !preferConfig.splitHours && preferConfig.classroomIds?.length) {
          const stringifiedClassroomIds = preferConfig.classroomIds.map(String);
          if (!stringifiedClassroomIds.includes(String(evt.extendedProps.classroomId))) {
            const errKey = `${baseErrKey}-room`;
            if (!reportedLockedErrors.has(errKey)) {
              reportedLockedErrors.add(errKey);
              const classObj = classrooms?.find(c => stringifiedClassroomIds.includes(String(c.id)));
              setErrors({
                name: evt.title,
                description: `[SECCIÓN CONGELADA] Conflicto de Aula: Esta materia exige un aula exclusiva (ej. ${classObj?.classroom || "Otra"}), pero está fijada en otra distinta. Descongele la sección.`,
                seccion: evt.extendedProps.seccion,
                year: evt.extendedProps.trayectoName || "",
                turn: evt.extendedProps.turnName || "",
                pnfName: evt.extendedProps.pnfName || "",
                professorName: professorName || undefined,
                trimestre,
              });
            }
          }
        }
      }
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

    // Ya no cortamos por frozenSet; las porciones sin asignar de secciones congeladas deben intentar resolverse
    return true;
  });

  const tasks: SubjectTask[] = filteredSubjects
    .flatMap((sub): SubjectTask[] => {
      const professorId = sub.quarter[trimestre];
      const turnoName = sub.turnoName?.toLowerCase() || "";
      const subjectNorm = normalizeText(sub.subject);
      const trayectoNorm = normalizeText(sub.trayectoName || "");
      // Compound key: includes trayecto for per-trayecto classroom restrictions
      const subjectKey = `${subjectNorm}_t_${trayectoNorm}`;
      const originalTotalHours = sub.hours[trimestre]!;

      const placedHours = lockedEvents.filter(e => e.extendedProps?.subjectId === sub.innerId).length;
      const totalHours = originalTotalHours - placedHours;

      if (totalHours <= 0 || !professorId) return [];

      const timeSlots = activeTurnos[turnoName];
      if (!timeSlots || timeSlots.length === 0) return [];

      // Si preventSingleHourBlocks está activo y solo tiene 1 hora TOTAL, reportar error
      if (preventSingleHourBlocks && originalTotalHours === 1) {
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
        return [];
      }

      // Restricciones de profesor
      const teacherRest = unavailableDays?.find(
        (r) => String(r.teacherId) === String(professorId),
      );
      const restrictedDays = teacherRest?.days?.map(String) ?? [];
      const restrictedHours = teacherRest?.hours ?? [];
      const availableDays = days.filter((d) => !restrictedDays.includes(String(d)));

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

      // Aulas candidatas
      // 1. Si es exclusivo: SOLO usar las aulas seleccionadas
      // 2. Si no es exclusivo pero hay seleccionadas: PREFERIR las seleccionadas, luego el resto
      // 3. Si no hay nada seleccionado: Usar todas, deprioritizando las reservadas
      const candidateClassrooms = preferConfig?.classroomIds?.length
        ? (preferConfig.isExclusive
          ? classrooms.filter((c) => preferConfig.classroomIds.includes(c.id))
          : classrooms.filter((c) => preferConfig.classroomIds.includes(c.id) || !c.exclusive).sort((a, b) => {
            const aInPref = preferConfig.classroomIds.includes(a.id);
            const bInPref = preferConfig.classroomIds.includes(b.id);
            if (aInPref && !bInPref) return -1;
            if (!aInPref && bInPref) return 1;
            // Si ambos están o ninguno está, usar orden de reserva usual
            const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0;
            const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0;
            return aReserved - bReserved;
          })
        )
        : classrooms.filter((c) => !c.exclusive).sort((a, b) => {
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
        const restrictedDayNames = restrictedDays.map((d: string) => dayNames[Number(d)] || `Día ${d}`).join(", ");

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
        return [];
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
        const hoursPerAvailableDay = sub.hours[trimestre]! / availableDays.length;
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
      score += sub.hours[trimestre]! * 3;

      // Factor IMPORTANTE: pocos slots en el turno (Ej: mañana o tarde vs diurno)
      // Priorizamos fuertemente a los turnos cortos (~6 slots) sobre turnos largos (~12 slots)
      // para evitar que el diurno sature las aulas limitadas de esos turnos.
      score += Math.max(0, 15 - timeSlots.length) * 100;

      const hasTeacherRestrictions = restrictedDays.length > 0 || restrictedHours.length > 0;
      const hasClassroomRestrictions = !!(preferConfig?.classroomIds?.length);

      // ─── Classroom Overrides: Convert overrides to strictly forced tasks ───
      const subjectOverrides = classroomOverrides?.filter(
        (ov: ClassroomOverride) =>
          sub.subject === ov.subject_name &&
          (!ov.seccion || sub.seccion === ov.seccion) &&
          (!ov.pnf_id || sub.pnfId === ov.pnf_id) &&
          (!ov.trayecto_id || sub.trayectoId === ov.trayecto_id)
      ) || [];

      let remainingHours = originalTotalHours;
      const results: SubjectTask[] = [];

      for (const ov of subjectOverrides) {
        // Encontrar los slots
        const startIndex = timeSlots.findIndex(t => t[0] === ov.start_time);
        const endIndex = timeSlots.findIndex(t => t[1] === ov.end_time);
        if (startIndex === -1 || endIndex === -1) continue;
        const length = endIndex - startIndex + 1;

        remainingHours -= length;

        results.push({
          subject: sub,
          totalHours: length,
          professorId,
          turnoName,
          timeSlots: timeSlots.slice(startIndex, endIndex + 1), // Only those exact slots!
          availableDays: [ov.day], // Restrict to exact day
          restrictedHours: [],
          candidateClassrooms: classrooms.filter(c => c.id === ov.classroom_id),
          effectiveConserveSlots: length,
          effectiveMinConsecutive: length,
          preferLastSlot: false,
          constraintScore: score + 10000, // VERY HIGH PRIORITY
          preventSingleHourBlocks: false,
          hasTeacherRestrictions: true,
          hasClassroomRestrictions: true,
          isClassroomExclusive: true,
        });
      }

      if (remainingHours <= 0) {
        return results;
      }

      // ─── Split Hours: dividir la materia en dos tasks ───
      // Si splitHours está activo, la parte mayor de las horas va en las aulas
      // seleccionadas y la parte menor en cualquier aula no exclusiva.
      if (preferConfig?.splitHours && preferConfig.classroomIds?.length && remainingHours >= 2) {
        const preferredHours = Math.ceil(remainingHours / 2);
        const otherHours = remainingHours - preferredHours;

        // Task A: horas en las aulas seleccionadas (parte mayor)
        const preferredRooms = classrooms.filter((c) => preferConfig.classroomIds.includes(c.id));
        // Task B: horas en aulas no exclusivas (parte menor)
        const nonExclusiveRooms = classrooms.filter((c) => !c.exclusive && !preferConfig.classroomIds.includes(c.id)).sort((a, b) => {
          const aReserved = reservedClassroomIds.has(a.id) ? 1 : 0;
          const bReserved = reservedClassroomIds.has(b.id) ? 1 : 0;
          return aReserved - bReserved;
        });

        const baseSlotsConfig = preferConfig?.preferLastSlot ? [...timeSlots].reverse() : timeSlots;

        if (preferredRooms.length > 0 && preferredHours > 0) {
          results.push({
            subject: sub,
            totalHours: preferredHours,
            professorId,
            turnoName,
            timeSlots: baseSlotsConfig,
            availableDays,
            restrictedHours,
            candidateClassrooms: preferredRooms,
            effectiveConserveSlots: conserveSlots,
            effectiveMinConsecutive: Math.min(minConsecutiveSlots, preferredHours),
            preferLastSlot: preferConfig?.preferLastSlot || false,
            constraintScore: score + 100, // Prioridad más alta para la parte de aula preferida
            preventSingleHourBlocks,
            hasTeacherRestrictions,
            hasClassroomRestrictions: true,
            isClassroomExclusive: true,
            breaks,
          });
        }

        if (nonExclusiveRooms.length > 0 && otherHours > 0) {
          results.push({
            subject: sub,
            totalHours: otherHours,
            professorId,
            turnoName,
            timeSlots: baseSlotsConfig,
            availableDays,
            restrictedHours,
            candidateClassrooms: nonExclusiveRooms,
            effectiveConserveSlots: conserveSlots,
            effectiveMinConsecutive: Math.min(minConsecutiveSlots, otherHours),
            preferLastSlot: preferConfig?.preferLastSlot || false,
            constraintScore: score + 50,
            preventSingleHourBlocks: preventSingleHourBlocks && otherHours >= 2,
            hasTeacherRestrictions,
            hasClassroomRestrictions: false,
            isClassroomExclusive: false,
            breaks,
          });
        }

        return results.length > 0 ? results : [];
      }

      results.push({
        subject: sub,
        totalHours: remainingHours,
        professorId,
        turnoName,
        timeSlots: preferConfig?.preferLastSlot
          ? [...timeSlots].reverse()
          : timeSlots,
        availableDays,
        restrictedHours,
        candidateClassrooms,
        effectiveConserveSlots: conserveSlots,
        effectiveMinConsecutive: Math.min(minConsecutiveSlots, remainingHours),
        preferLastSlot: preferConfig?.preferLastSlot || false,
        constraintScore: score,
        preventSingleHourBlocks: preventSingleHourBlocks && remainingHours >= 2,
        hasTeacherRestrictions,
        hasClassroomRestrictions,
        isClassroomExclusive: !!(preferConfig?.classroomIds?.length && preferConfig.isExclusive),
        breaks,
      });

      return results;
    });

  // ─── Step 3: Ordenar por prioridad de restricciones ───
  // ESTRATEGIA: Las materias con cualquier tipo de restricción van PRIMERO,
  // ordenadas de más restringido a menos restringido.
  // Dentro del mismo nivel de restricción, se agrupan por profesor.
  tasks.sort((a, b) => {
    // Nivel 0: Exclusividad estricta de aula MANDA (siempre priorizar materias que NECESITAN un aula específica)
    if (a.isClassroomExclusive !== b.isClassroomExclusive) {
      return a.isClassroomExclusive ? -1 : 1;
    }

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

    // Fase 2: Relajar minConsecutive (permitir bloques más pequeños).
    // ═══════════════════════════════════════════════════════════════════
    // REGLA DE HIERRO: effectiveConserveSlots (máximo horas/día) NUNCA
    // se relaja. Si no cabe, se reporta error. No se sobrepasan las
    // 3 horas diarias (o el límite configurado) bajo ninguna
    // circunstancia, ni siquiera en la fase de relajación.
    // ═══════════════════════════════════════════════════════════════════
    const relaxedTask: SubjectTask = {
      ...task,
      effectiveConserveSlots: task.effectiveConserveSlots, // MANTENER el límite original
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
        // REGLA DE HIERRO: nunca exceder el límite original por día
        effectiveConserveSlots: Math.min(tryHours, task.effectiveConserveSlots),
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

  // Agregar los eventos bloqueados primero
  if (lockedEvents.length > 0) {
    events.push(...lockedEvents);
  }

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
      professorId: task.professorId || undefined,
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
      professorId: task.professorId || undefined,
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
