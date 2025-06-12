export default async function deleteTrayecto({ id }: { id: string }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const body = {
    id
  }


  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/trayectos" : "/trayectos";

  const response = await fetch(url, {
    method: "DELETE",
    headers: headersList,
    body: JSON.stringify(body),
    credentials: 'include'
  });

  const data = await response.json();
  return data

}