
export default async function getMaya({ sagaPNFID }: { sagaPNFID: string | null | undefined }) {

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/proyecciones/mayas/" : "/proyecciones/mayas/";
  const headersList = {
    "Accept": "*/*"
  }

  const response = await fetch(`${url}${sagaPNFID}`, {
    method: "GET",
    headers: headersList,

  });

  const data = await response.json();
  return data

}