export default async function getTrayectos() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/trayectos" : "/trayectos";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}