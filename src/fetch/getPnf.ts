export default async function getPnf() {

  const url = import.meta.env.MODE === 'development' ? "/pnfs" : "/pnfs";
  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,

  });

  if (response.status !== 200) {
    console.log(response.status);
    return;
  }

  const data = await response.json();
  return data;
}