import { UserData } from "../components/createUser/createUserPanel";
export default async function deleteUser(requestData: UserData) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };


  const url = import.meta.env.MODE === "development" ? "/user" : "/user";

  const response = await fetch(url, {
    method: "DELETE",
    body: JSON.stringify(requestData),
    headers: headersList,

  });

  const data = await response.json();
  return data;
}

