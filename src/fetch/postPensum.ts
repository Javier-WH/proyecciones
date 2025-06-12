export default async function postPensum({ id, pnf_id, subject_id, trayecto_id, hours, quarter }
  : { id: string | undefined, pnf_id: string | undefined, subject_id: string | undefined, trayecto_id: string | undefined, hours: string | undefined, quarter: string | undefined }) {

  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify({
    id, 
    pnf_id, 
    subject_id, 
    trayecto_id, 
    hours, 
    quarter
  });

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/pensum" : "/pensum";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  return data

}