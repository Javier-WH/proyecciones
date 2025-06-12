export default async function setActiveProyection({ active_proyection }: { active_proyection: string }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const body = {
    active_proyection
  }


  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/setProyection" : "/setProyection";

  const response = await fetch(url, {
    method: "POST",
    headers: headersList,
    body: JSON.stringify(body),

  });

  const data = await response.json();
  return data

}