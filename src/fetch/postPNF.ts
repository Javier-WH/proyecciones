export default async function postPNF({ id, name, active, saga_id }
  : { id: string | undefined, name: string | undefined, active: number | undefined, saga_id: number | undefined }) {

  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify({
    id,
    name,
    active,
    saga_id
  });

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/pnf" : "/pnf";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList
  });

  const data = await response.json();
  return data

}