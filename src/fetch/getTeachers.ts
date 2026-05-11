export default async function getTeachers() {
  const url = import.meta.env.MODE === "development" ? "/teachers" : "/teachers";
  const headersList = {
    Accept: "*/*",
  };

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  const data = await response.json();
  return data;
}

