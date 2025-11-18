export interface ScheduleDataBase {
  id?: string | undefined;
  name: string;
  schedule: string;
  proyection_id: string;
}

export async function getClassrooms() {
  const headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/classrooms" : "/classrooms";

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
  let headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };
  let bodyContent = JSON.stringify({
    ...(id && { id }),
    name,
    schedule,
    proyection_id,
  });

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/schedule" : "/schedule";

  let response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

export async function getSchedule({ id }: { id: string | undefined }) {
  let headersList = {
    Accept: "*/*",
  };
  const url =
    import.meta.env.MODE === "development"
      ? `http://localhost:3000/schedule${id ? `?id=${id}` : ""}`
      : `/schedule${id ? `?id=${id}` : ""}`;

  let response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, message: await response.json() };
  }
  return response.json();
}

