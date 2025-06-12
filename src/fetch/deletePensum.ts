export default async function deletePensum({ id }: { id: string }) {
  const headersList = {
    "Accept": "*/*",

  }

  const url = import.meta.env.MODE === 'development'
    ? `http://localhost:3000/pensum/${id}`
    : `/pensum/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}