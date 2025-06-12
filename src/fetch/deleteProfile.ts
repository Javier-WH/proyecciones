export default async function deleteProfile({ perfil_name_id }: { perfil_name_id: string }) {
    const headersList = {
      "Accept": "*/*",

    }
  
    const url = import.meta.env.MODE === 'development' 
    ? `http://localhost:3000/profile/${perfil_name_id}` 
    : `/profile/${perfil_name_id}`;
  
    const response = await fetch(url, {
      method: "DELETE",
      headers: headersList,

    });
  
    const data = await response.json();
    return data
  
  }