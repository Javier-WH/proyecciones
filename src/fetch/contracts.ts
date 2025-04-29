
export interface ContractTypeType {
    id: string;
    contractType?: string;
    hours?: number;
    active?: boolean;
}

export async function getContracts() {
    const headersList = {
      "Accept": "*/*",
    }
    const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/contractTypes" : "/contractTypes";
  
    const response = await fetch(url, {
      method: "GET",
      headers: headersList
    });
  
    const data = await response.json();
    return data
  
}

export async function putContract({id, contractType, hours, active }: ContractTypeType) {
    const headersList = {
      "Accept": "*/*",
      "Content-Type": "application/json"
    }
    let body: ContractTypeType = {
      id
    }
    if (contractType) body.contractType = contractType;
    if (hours) body.hours = hours;
    if (active) body.active = active;
  
    const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/contractType" : "/contractType";
  
    const response = await fetch(url, {
      method: "PUT",
      headers: headersList,
      body: JSON.stringify(body)
    });
  
    const data = await response.json();
    return data
  
  }