
export default async function getPensum({ programaId, trayectoId, mayaId }: { programaId: string | null | undefined, trayectoId: string | null | undefined, mayaId: string | null | undefined }) {

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/proyecciones/pensum/" : "/proyecciones/pensum/";
  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(`${url}${programaId}/${trayectoId}/${mayaId}`, {
    method: "GET",
    headers: headersList,

  });

  const data = await response.json();
  return data

}