export interface ClassroomOverride {
  id?: string;
  subject_name: string;
  day: number;
  start_time: string;
  end_time: string;
  classroom_id: string;
  seccion?: string | null;
  pnf_id?: string | null;
  trayecto_id?: string | null;
}

function baseUrl(path: string): string {
  return import.meta.env.MODE === "development" ? `${path}` : path;
}

export async function getClassroomOverrides(proyectionId: string) {
  const response = await fetch(baseUrl(`/classroom-overrides/${proyectionId}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function saveClassroomOverrides(proyectionId: string, overrides: ClassroomOverride[]) {
  const response = await fetch(baseUrl("/classroom-overrides"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      proyection_id: proyectionId,
      overrides,
    }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function deleteClassroomOverride(id: string) {
  const response = await fetch(baseUrl(`/classroom-overrides/${id}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}

export async function deleteAllClassroomOverrides(proyectionId: string) {
  const response = await fetch(baseUrl(`/classroom-overrides/all/${proyectionId}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json().catch(() => ({})) };
  }
  return response.json();
}
