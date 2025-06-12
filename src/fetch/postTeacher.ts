export default async function postTeacher(requestData
  : { 
    id: string | undefined,
    name: string | undefined,
    last_name: string | undefined,
    ci: string | undefined,
    gender_id: string | undefined,
    contractTypes_id: string | undefined,
    title: string | undefined,
    perfil_name_id: string | undefined
  }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const bodyContent = JSON.stringify(requestData);

  const url = import.meta.env.MODE === 'development'
    ? "http://localhost:3000/teacher"
    : "/teacher";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}
