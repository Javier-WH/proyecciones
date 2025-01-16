export default async function PostTrayecto({ name, order }: { name: string | undefined, order: number | undefined }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const body = {
    name,
    order
  }


  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/trayectos" : "/trayectos";

  const response = await fetch(url, {
    method: "POST",
    headers: headersList,
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return data

}