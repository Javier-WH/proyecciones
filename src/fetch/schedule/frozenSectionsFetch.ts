import { Event } from "../../components/SchoolSchedule/fucntions";

function baseUrl(path: string): string {
  return import.meta.env.MODE === "development" ? `http://localhost:3000${path}` : path;
}

export async function getFrozenSections(proyectionId: string): Promise<{
  frozenSections?: Record<string, Event[]>;
  error?: boolean;
  status?: number;
  message?: string;
}> {
  const response = await fetch(baseUrl(`/frozen-sections/${proyectionId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function saveFrozenSections(
  proyectionId: string,
  frozenSections: Record<string, Event[]>
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl("/frozen-sections"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      proyection_id: proyectionId,
      frozen_sections: frozenSections,
    }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function upsertFrozenSection(
  proyectionId: string,
  sectionKey: string,
  events: Event[]
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl("/frozen-sections"), {
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

export async function deleteFrozenSection(
  proyectionId: string,
  sectionKey: string
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl(`/frozen-sections/${proyectionId}/${encodeURIComponent(sectionKey)}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function deleteAllFrozenSections(
  proyectionId: string
): Promise<{ error?: boolean; status?: number; message?: string }> {
  const response = await fetch(baseUrl(`/frozen-sections/all/${proyectionId}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}
