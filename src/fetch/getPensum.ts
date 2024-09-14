
export default async function getPensum({programaId, trayectoId}: {programaId: string | null | undefined, trayectoId: string | null | undefined}) {

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/proyecciones/pensum/" : "/proyecciones/pensum/";
  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(`${url}${programaId}/${trayectoId}`, {
    method: "GET",
    headers: headersList
  });

  const data = await response.json();
  return data

}