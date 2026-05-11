export default async function postTeacher(requestData: {
  id: string | undefined;
  name: string | undefined;
  last_name: string | undefined;
  ci: string | undefined;
  gender_id: string | undefined;
  contractTypes_id: string | undefined;
  title: string | undefined;
  perfil_name_id: string | undefined;
  PNF: string | undefined | null;
  active: string | undefined;
  is_placeholder: boolean | undefined;
  email?: string | undefined | null;
}) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };
  const bodyContent = JSON.stringify(requestData);

  const url = import.meta.env.MODE === "development" ? "/teacher" : "/teacher";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
  });

  const data = await response.json();
  return data;
}

