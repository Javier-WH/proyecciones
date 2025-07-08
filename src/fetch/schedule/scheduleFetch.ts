import { ScheduleItem } from "../../components/schedule/scheduleInterfaces";
/**
 * Creates a new schedule on the server.
 * @param schedule An array of ScheduleItem objects, each containing the data for a single schedule item.
 * @returns A promise resolving to an object with two properties: error (a boolean indicating whether an error occurred) and message (a string describing the result of the operation).
 */
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
  return { error: false, status: response.status, message: "Horario creado correctamente" };
}

/**
 * Gets the list of days for the current year from the server.
 * @returns A promise resolving to an object with two properties: error (a boolean indicating whether an error occurred) and message (a string describing the result of the operation).
 * If an error occurred, the promise resolves to an object with an error property set to true and a status and message property describing the error.
 * If the operation was successful, the promise resolves to an object with an error property set to false and a message property containing the list of days.
 */
export async function getDays() {
  let headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/days" : "/days";

  let response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return response.json();
}

/**
 * Gets the list of hours for the current year from the server.
 * @returns A promise resolving to an object with two properties: error (a boolean indicating whether an error occurred) and message (a string describing the result of the operation).
 * If an error occurred, the promise resolves to an object with an error property set to true and a status and message property describing the error.
 * If the operation was successful, the promise resolves to an object with an error property set to false and a message property containing the list of hours.
 */
export async function getHours() {
  let headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/hours" : "/hours";

  let response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return response.json();
}

export async function getClassrooms() {
  let headersList = {
    Accept: "*/*",
  };

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/classrooms" : "/classrooms";

  let response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return response.json();
}

/**
 * Fetches the schedule data from the server.
 * @returns A promise that resolves to an object containing the schedule data if successful.
 * If an error occurs, the promise resolves to an object with an error property set to true,
 * a status code, and a message describing the error.
 */

export async function getSchedule() {
  let headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/schedule" : "/schedule";
  let response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (!response.ok) {
    return { error: true, status: response.status, message: await response.json() };
  }
  return response.json();
}

