export default async function deleteSubjectInPerfil({ id }: { id: string }) {
    const headersList = {
      "Accept": "*/*",
    }
  
    const url = import.meta.env.MODE === 'development' 
    ? `http://localhost:3000/profile/${id}` 
    : `/profile/${id}`;
  
    const response = await fetch(url, {
      method: "DELETE",
      headers: headersList
    });
  
    const data = await response.json();
    return data
  
  }


   