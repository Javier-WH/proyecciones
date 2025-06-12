export default async function setProfile({name, description}: {name: string, description:string}) {

    const headersList = {
      "Accept": "*/*",
       "Content-Type": "application/json"
    }

    const body = {
        name,
        description
    }
    const url = import.meta.env.MODE === 'development' ? `http://localhost:3000/profile` : `/profile`;
  
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: headersList,
      credentials: 'include'
    });
  
   
    const data = await response.json();
    return data
  
  }