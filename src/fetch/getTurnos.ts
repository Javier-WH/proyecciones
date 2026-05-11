export default async function getTurnos() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "/turnos" : "/turnos";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,

  });

  const data = await response.json();
  return data

}