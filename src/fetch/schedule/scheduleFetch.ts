export interface ScheduleDataBase {
  id?: string | undefined;
  name: string;
  schedule: string;
  proyection_id: string;
}

export async function createClassroom(classroom: string, active: boolean = true, exclusive: boolean = false) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  const url = import.meta.env.MODE === "development" ? "/classroom" : "/classroom";

  const response = await fetch(url, {
    method: "POST",
    headers: headersList,
    body: JSON.stringify({ classroom, active, exclusive }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }

  return response.json();
}

export async function updateClassroom(id: string, classroom: string, active: boolean, exclusive?: boolean) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  const url = import.meta.env.MODE === "development" ? `/classroom/${id}` : `/classroom/${id}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: headersList,
    body: JSON.stringify({ classroom, active, exclusive }),
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }

  return response.json();
}

export async function deleteClassroom(id: string) {
  const headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? `/classroom/${id}` : `/classroom/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: headersList,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Error desconocido" }));
    return { error: true, status: response.status, message: errorBody };
  }

  return response.json();
}

export async function saveSubjectRestrictions(payload: {
  proyection_id: string;
  restrictions: {
    subject_key: string;
    subject_name: string;
    classroom_ids: string[];
  }[];
}) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  const url = import.meta.env.MODE === "development" ? "/subject-restrictions" : "/subject-restrictions";

  const response = await fetch(url, {
    method: "POST",
    headers: headersList,
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const parseBody = async () => {
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return { message: await response.text() };
  };

  const body = await parseBody().catch(() => ({ message: "Respuesta inesperada del servidor" }));

  if (!response.ok) {
    return { error: true, status: response.status, message: body };
  }

  return body;
}

export async function getSubjectRestrictions(proyectionId: string) {
  const headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development"
    ? `/subject-restrictions/${proyectionId}`
    : `/subject-restrictions/${proyectionId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const parseBody = async () => {
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return { message: await response.text() };
  };

  const body = await parseBody().catch(() => ({ message: "Respuesta inesperada del servidor" }));

  if (!response.ok) {
    return { error: true, status: response.status, message: body };
  }

  return body;
}

export async function getClassrooms() {
  const headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? "/classrooms" : "/classrooms";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return response.json();
}

export async function insertOrUpdateSchedule({
  id = undefined,
  name,
  schedule,
  proyection_id,
}: ScheduleDataBase) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };
  const bodyContent = JSON.stringify({
    ...(id && { id }),
    name,
    schedule,
    proyection_id,
  });

  const url = import.meta.env.MODE === "development" ? "/schedule" : "/schedule";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

export interface ScheduleVersion {
  id: string;
  version_number: number;
  change_type: string;
  description: string | null;
  created_at: string;
}

export interface ScheduleVersionDetail {
  state_snapshot: Record<string, unknown>;
}

export async function getScheduleVersions(proyectionId: string, trimestre: string) {
  const headersList = { Accept: "*/*" };
  const response = await fetch(`/schedule-versions/${proyectionId}/${trimestre}`, {
    method: "GET",
    headers: headersList,
  });
  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

export async function getScheduleVersionDetail(id: string) {
  const headersList = { Accept: "*/*" };
  const response = await fetch(`/schedule-versions/detail/${id}`, {
    method: "GET",
    headers: headersList,
  });
  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

export async function getSchedule({ id }: { id?: string | undefined }) {
  const headersList = {
    Accept: "*/*",
  };
  const url =
    import.meta.env.MODE === "development"
      ? `/schedule${id ? `?id=${id}` : ""}`
      : `/schedule${id ? `?id=${id}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

