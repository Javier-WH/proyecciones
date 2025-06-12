export default async function getProfile({id}: {id: string}) {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? `http://localhost:3000/profile/${id}` : `/profile/${id}`;

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

 
  const data = await response.json();
  return data

}