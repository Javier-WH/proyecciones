import { ScheduleItem } from "../../components/schedule/scheduleInterfaces";
export async function InsertSchedule(schedule: ScheduleItem[]) {
  let headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  let bodyContent = JSON.stringify({ schedule });

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/schedule" : "/schedule";
  let response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return { error: true, status: response.status, message: "Horario creado correctamente" };
}

