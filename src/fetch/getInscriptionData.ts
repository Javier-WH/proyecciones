
export default async function getInscriptionData({programId, trayectoId}: {programId: string, trayectoId: string}) {

  const url = import.meta.env.MODE === 'development' 
    ? `http://localhost:3000/proyecciones/inscriptionData/${programId}/${trayectoId}` 
    : `/proyecciones/inscriptionData/${programId}/${trayectoId}`

  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(url, {
    method: "GET",
    headers: headersList
  });

  const data = await response.json();
  
  return data
  
}