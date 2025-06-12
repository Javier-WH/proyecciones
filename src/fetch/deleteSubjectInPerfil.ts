export default async function deleteSubjectInPerfil({ id }: { id: string }) {
    const headersList = {
      "Accept": "*/*",
    }
  
    const url = import.meta.env.MODE === 'development' 
      ? `http://localhost:3000/subjectinprofile/${id}` 
      : `/subjectinprofile/${id}`;
  
    const response = await fetch(url, {
      method: "DELETE",
      headers: headersList,

    });
  
    const data = await response.json();
    return data
  
  }


   