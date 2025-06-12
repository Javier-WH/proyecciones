export default async function getSimpleData() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/simpleData" : "/simpleData";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}