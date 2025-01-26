export default async function deletePNF({ id }: { id: string }) {
  const headersList = {
    "Accept": "*/*",
  }

  const url = import.meta.env.MODE === 'development'
    ? `http://localhost:3000/pnf/${id}`
    : `/pnf/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: headersList
  });

  const data = await response.json();
  return data

}


