export default async function postSubjectToPerfil({ perfil_name_id, subject_id, subject_name }
  : { perfil_name_id: string, subject_id: string, subject_name: string }) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }
  const bodyContent = JSON.stringify({
    perfil_name_id,
    subject_id,
    subject_name
  });



  const url = import.meta.env.MODE === 'development'
    ? "/profile/addSubject"
    : "/profile/addSubject";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,

  });

  const data = await response.json();
  return data

}




