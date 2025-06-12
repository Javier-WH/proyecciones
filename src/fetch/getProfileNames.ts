export default async function getProfileNames() {
  const headersList = {
    "Accept": "*/*",
  }
  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/profileNames" : "/profileNames";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,

  });

  const data = await response.json();
  return data

}