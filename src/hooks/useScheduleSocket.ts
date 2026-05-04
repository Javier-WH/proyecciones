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
import type { Socket } from "socket.io-client";
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

const emptyState: ScheduleState = {
  eventData: [],
  stagedEvents: [],
  lockedSections: {},
  classroomOverrides: [],
  scheduleConfig: {},
};

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
  const socket = (ctx as unknown as { socket: Socket | null })?.socket ?? null;

  const [state, setState] = useState<ScheduleState>(emptyState);
  const [version, setVersion] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(!!socket?.connected);
  const versionRef = useRef<number>(0);

  // Keep a ref in sync so `dispatch` can read it without re-binding
  useEffect(() => { versionRef.current = version; }, [version]);

  useEffect(() => {
    if (!socket || !proyectionId) return;

    const onState = (msg: { proyectionId: string; trimestre: Trimestre; version: number; state: ScheduleState }) => {
      if (msg.proyectionId !== proyectionId || msg.trimestre !== trimestre) return;
      setState({ ...emptyState, ...msg.state });
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
            (ack: Ack) => resolve(ack ?? { ok: false, code: "NO_ACK", message: "Sin respuesta" })
          );
        }),
    [socket, proyectionId, trimestre]
  );

  return { state, version, connected, dispatch };
}
