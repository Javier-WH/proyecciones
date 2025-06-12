
export default async function postSubjects({ id, name, active }: { id: string | undefined, name: string | undefined, active: number | undefined}) {

  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify({
    id,
    name,
    active
  });

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/subject" : "/subject";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}