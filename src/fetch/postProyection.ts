
export default async function postProyection({ year, name }: { year: string , name: string }) {

  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify({
    year,
    name
  });

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/proyeccion" : "/proyeccion";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList
  });

  const data = await response.json();
  return data

}