export default async function postSubjectToPerfil({ perfil_name_id, subject_id }
    : { perfil_name_id: string,  subject_id: string }) {
    const headersList = {
      "Accept": "*/*",
      "Content-Type": "application/json"
    }
    const bodyContent = JSON.stringify({
        perfil_name_id, 
        subject_id
      });
  
  

    const url = import.meta.env.MODE === 'development' 
        ? "http://localhost:3000/profile/addSubject" 
        : "/profile/addSubject";
  
    const response = await fetch(url, { 
        method: "POST",
        body: bodyContent,
        headers: headersList,
        credentials: 'include'
      });
  
    const data = await response.json();
    return data
  
  }

  
   

   