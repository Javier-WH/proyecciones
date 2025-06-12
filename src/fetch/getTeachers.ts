export default async function getTeachers() {

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/teachers" : "/teachers";
  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}