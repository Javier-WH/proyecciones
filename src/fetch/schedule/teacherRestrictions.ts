export interface TeacherRestrictionPayload {
  teacher_id: string;
  restricted_days: number[];
  restricted_hours: { day: number; start: string; end: string }[];
}

const BASE_URL = import.meta.env.MODE === "development" ? "" : "";

const defaultHeaders = {
  Accept: "*/*",
  "Content-Type": "application/json",
};

export async function getTeacherRestriction(teacherId: string) {
  const url = `${BASE_URL}/teacher-restrictions/${teacherId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: defaultHeaders,
  });

  return response.json();
}

export async function getTeacherRestrictionsList() {
  const url = `${BASE_URL}/teacher-restrictions`;

  const response = await fetch(url, {
    method: "GET",
    headers: defaultHeaders,
  });

  return response.json();
}

export async function saveTeacherRestriction(payload: TeacherRestrictionPayload) {
  const url = `${BASE_URL}/teacher-restrictions`;

  const response = await fetch(url, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(payload),
  });

  return response.json();
}
