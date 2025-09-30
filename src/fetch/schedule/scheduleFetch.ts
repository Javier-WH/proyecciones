
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



