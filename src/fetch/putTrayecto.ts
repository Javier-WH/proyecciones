export default async function putTrayecto({id, name, order}: {id: string, name: string | undefined, order: number | undefined}) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const body = {
    id,
    name,
    order
  }


  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/trayectos" : "/trayectos";

  const response = await fetch(url, {
    method: "PUT",
    headers: headersList,
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return data

}