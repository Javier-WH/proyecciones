// =====================================================
// useScheduleSocket — client for the backend-driven schedule.
//
// Joins the `schedule:<proyectionId>:<trimestre>` room, keeps a local
// copy of the authoritative state, and exposes `dispatch(name, payload)`
// with optimistic-locking retry semantics. On VERSION_CONFLICT the server
// automatically pushes a fresh `schedule:state` broadcast; consumers do
// not need to handle the stale snapshot manually.
//
// This hook is intentionally framework-agnostic (no antd / no modals):
// it only handles the transport. UI components subscribe to the returned
// `state` and call `dispatch`.
// =====================================================

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { MainContext } from "../context/mainContext";
import type { MainContextValues } from "../interfaces/contextInterfaces";
import type { Event } from "../components/SchoolSchedule/fucntions";

export type Trimestre = "q1" | "q2" | "q3";

export interface ScheduleState {
  eventData: Event[];
  stagedEvents: Event[];
  lockedSections: Record<string, Event[]>;
  classroomOverrides: unknown[];
  scheduleConfig: Record<string, unknown>;
  lastGenerationErrors?: unknown[];
}

export interface StateDelta {
  eventData?: {
    added?: Event[];
    removed?: string[];
    changed?: Event[];
  };
  lockedSections?: Record<string, Event[]>;
  classroomOverrides?: unknown[];
}

const emptyState: ScheduleState = {
  eventData: [],
  stagedEvents: [],
  lockedSections: {},
  classroomOverrides: [],
  scheduleConfig: {},
};

function getEventId (event: Event): string {
  return `${event.extendedProps?.subjectId}-${event.extendedProps?.seccion}-${event.daysOfWeek?.[0]}-${event.startTime}`;
}

/**
 * Apply a delta (add/remove/change) on top of a previous state.
 * Returns a new state without mutating the previous one.
 */
function applyDelta (prev: ScheduleState, delta: StateDelta): ScheduleState {
  const next = { ...prev };

  if (delta.eventData) {
    const removedIds = new Set(delta.eventData.removed || []);
    const changedMap = new Map<string, Event>();
    for (const e of (delta.eventData.changed || [])) {
      changedMap.set(getEventId(e), e);
    }
    const addedMap = new Map<string, Event>();
    for (const e of (delta.eventData.added || [])) {
      addedMap.set(getEventId(e), e);
    }

    // Remove
    let filtered = next.eventData.filter(e => !removedIds.has(getEventId(e)));
    // Replace changed
    filtered = filtered.map(e => {
      const id = getEventId(e);
      return changedMap.has(id) ? changedMap.get(id)! : e;
    });
    // Add (only if not already present)
    for (const [id, newEv] of addedMap) {
      if (!filtered.some(e => getEventId(e) === id)) {
        filtered.push(newEv);
      }
    }
    next.eventData = filtered;
  }

  if (delta.lockedSections) {
    next.lockedSections = { ...prev.lockedSections, ...delta.lockedSections };
  }
  if (delta.classroomOverrides) {
    next.classroomOverrides = delta.classroomOverrides;
  }

  return next;
}

export interface AckSuccess { ok: true; version?: number; state?: ScheduleState }
export interface AckFailure { ok: false; code: string; message: string; currentVersion?: number }
export type Ack = AckSuccess | AckFailure;

/**
 * Subscribe to the backend schedule state for a given (proyection, trim).
 *
 * @param proyectionId active proyection (null = do nothing)
 * @param trimestre    active trimestre
 */
export function useScheduleSocket(
  proyectionId: string | null | undefined,
  trimestre: Trimestre
) {
  const ctx = useContext(MainContext) as MainContextValues | null;
  const socket = ctx?.socket ?? null;

  const [state, setState] = useState<ScheduleState>(emptyState);
  const [version, setVersion] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(!!socket?.connected);
  const versionRef = useRef<number>(0);

  // Keep a ref in sync so `dispatch` can read it without re-binding
  useEffect(() => { versionRef.current = version; }, [version]);

  useEffect(() => {
    if (!socket || !proyectionId) return;

    // Initialise from the socket's current state in case it's already
    // connected before this effect runs.
    setConnected(!!socket.connected);

    const onState = (msg: {
        proyectionId: string;
        trimestre: Trimestre;
        version: number;
        state: ScheduleState;
        delta?: StateDelta;
      }) => {
        if (msg.proyectionId !== proyectionId || msg.trimestre !== trimestre) return;

        // Apply delta when available, contiguous, and the delta is smaller
        if (msg.delta && msg.version === versionRef.current + 1) {
          setState(prev => applyDelta(prev, msg.delta!));
        } else {
          setState({ ...emptyState, ...msg.state });
        }
        setVersion(msg.version);
      };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("schedule:state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Join the room
    socket.emit(
      "schedule:join",
      { proyectionId, trimestre },
      (ack: Ack) => {
        if (!ack?.ok) console.error("schedule:join failed", ack);
      }
    );

    return () => {
      socket.off("schedule:state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.emit("schedule:leave", { proyectionId, trimestre });
    };
  }, [socket, proyectionId, trimestre]);

const dispatch = useMemo(
    () =>
      (name: string, payload: unknown): Promise<Ack> =>
        new Promise((resolve) => {
          if (!socket || !proyectionId) {
            resolve({ ok: false, code: "NO_SOCKET", message: "Socket no conectado" });
            return;
          }
          socket.emit(
            name,
            { proyectionId, trimestre, baseVersion: versionRef.current, payload },
            (ack: Ack) => {
              resolve(ack ?? { ok: false, code: "NO_ACK", message: "Sin respuesta" })
            }
          );
        }),
    [socket, proyectionId, trimestre]
  );

  return { state, version, connected, dispatch };
}
