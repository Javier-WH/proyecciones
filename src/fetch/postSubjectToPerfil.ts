export default async function postSubjectToPerfil({ perfil_name_id, subject_id }
    : { perfil_name_id: string,  subject_id: string }) {
    const headersList = {
      "Accept": "*/*",
      "Content-Type": "application/json"
    }
    let bodyContent = JSON.stringify({
        perfil_name_id, 
        subject_id
      });
  
  

    const url = import.meta.env.MODE === 'development' 
        ? "http://localhost:3000/profile/addSubject" 
        : "/profile/addSubject";
  
    let response = await fetch(url, { 
        method: "POST",
        body: bodyContent,
        headers: headersList
      });
  
    const data = await response.json();
    return data
  
  }

  
   

   