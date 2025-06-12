export default async function getTurnos() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/turnos" : "/turnos";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,

  });

  const data = await response.json();
  return data

}