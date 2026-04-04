import { Event } from "../../components/SchoolSchedule/fucntions";

function baseUrl(path: string): string {
  return import.meta.env.MODE === "development" ? `http://localhost:3000${path}` : path;
}

export async function getLockedSections(proyectionId: string): Promise<{
  lockedSections?: Record<string, Event[]>;
  error?: boolean;
  status?: number;
  message?: string;
}> {
  const response = await fetch(baseUrl(`/locked-sections/${proyectionId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function saveLockedSections(
  proyectionId: string,
  lockedSections: Record<string, Event[]>
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl("/locked-sections"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      proyection_id: proyectionId,
      locked_sections: lockedSections,
    }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function upsertLockedSection(
  proyectionId: string,
  sectionKey: string,
  events: Event[]
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl("/locked-sections"), {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      proyection_id: proyectionId,
      section_key: sectionKey,
      events,
    }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function deleteLockedSection(
  proyectionId: string,
  sectionKey: string
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl(`/locked-sections/${proyectionId}/${encodeURIComponent(sectionKey)}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function deleteAllLockedSections(
  proyectionId: string
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl(`/locked-sections/all/${proyectionId}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function updateLockedSectionStage(
  proyectionId: string,
  sectionKey: string,
  stage: 'planning' | 'official'
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl(`/locked-sections/${proyectionId}/${encodeURIComponent(sectionKey)}/stage`), {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}
