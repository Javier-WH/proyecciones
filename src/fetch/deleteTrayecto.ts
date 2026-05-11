export default async function deleteTrayecto({ id }: { id: string }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const body = {
    id
  }


  const url = import.meta.env.MODE === 'development' ? "/trayectos" : "/trayectos";

  const response = await fetch(url, {
    method: "DELETE",
    headers: headersList,
    body: JSON.stringify(body),

  });

  const data = await response.json();
  return data

}