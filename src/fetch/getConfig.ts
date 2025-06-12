export default async function getConfig() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/config" : "/config";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}