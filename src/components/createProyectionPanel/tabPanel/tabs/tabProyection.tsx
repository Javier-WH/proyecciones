import { useContext, useEffect, useState } from "react";
import { Subject } from "../../../../interfaces/subject";
import { Button, Divider} from "antd";
import { MainContext } from "../../../../context/mainContext";
import { MainContextValues } from "../../../../interfaces/contextInterfaces";
import { v4 as uuidv4 } from "uuid";

interface SeccionContentItem {
  turnoName?: string;
  sectionCount?: number;
}


export default function TabProyection({ subjectList, turnos }: { subjectList: Subject[], turnos: string[] }) {

  const { handleSubjectChange, subjects} = useContext(MainContext) as MainContextValues;
  
  const [secciones, setSecciones] = useState<SeccionContentItem[]>([]);

  // llena el array de secciones con los valores de turnos
  useEffect(() => {
    if (!turnos) return;
    const newSecciones = sortTurns(turnos)?.map((turno) => {
      return {
        turnoName: turno,
        sectionCount: 1,
      };
    });
    setSecciones(newSecciones);
  }, [turnos])

  // actualiza el array de secciones cuando cambia el numero de secciones
  const handleSectionCountChange = (turnoName: string, newCount: number) => {
    const seccionesCopy = [...secciones];
    const updatedSecciones = seccionesCopy.map((seccion) => {
      if (seccion.turnoName === turnoName && typeof seccion.sectionCount === "number") {
        return { ...seccion, sectionCount: Math.max(1, seccion.sectionCount + newCount) };
      }
      return seccion;
    });
    setSecciones(updatedSecciones);
  }


  // funcion que se encarga de proyectar las materias
  const handleProyectar = () => {
    if (secciones.length === 0) {
      alert("No hay secciones para proyectar");
      return;
    }
    const proyectedSubjects: Subject[] = [];
    for (const seccion of secciones) {
      const { turnoName, sectionCount } = seccion;
      for (let i = 1; i <= sectionCount!; i++) {
        const subjectListCopy = JSON.parse(JSON.stringify(subjectList));
        for (const subject of subjectListCopy) {
          subject.innerId = uuidv4();
          subject.turnoName = turnoName || "No definido";
          subject.seccion = i.toString();
          proyectedSubjects.push(subject);
        }

      }
    }

    handleSubjectChange([...proyectedSubjects, ...(subjects ?? [])]);

  };



  return (
    <div>
      <Button type="primary" onClick={handleProyectar}>Proyectar</Button>
      <Divider type="horizontal"/>
      <h3 style={{ color: "gray" }}>Numero de secciones por turno</h3>
      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
        {
          secciones.map((seccion) => (
            <div 
              key={seccion.turnoName}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "white",
                borderRadius: "10px",
                width: "130px",
                height: "150px",
                margin: "10px",
                padding: "10px",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3>{seccion.turnoName}</h3>

              <span
                style={{
                  fontSize: "40px",
                  fontWeight: "bold",
                  color: "#1890ff",
                  marginBottom: "10px",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {seccion.sectionCount}
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "5px",
                  width: "100%",
                }}
              >
                <Button type="primary" danger onClick={() => handleSectionCountChange(seccion.turnoName!, -1)}>-</Button>
                <Button type="primary" onClick={() => handleSectionCountChange(seccion.turnoName!, 1)}>+</Button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}


function sortTurns(arr: string[]) {
  const ordenDeseado = ["Mañana", "Tarde", "Noche"];
  arr.sort((a: string, b: string) => {
    const indexA = ordenDeseado.indexOf(a);
    const indexB = ordenDeseado.indexOf(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    else if (indexA !== -1) {
      return -1;
    }
    else if (indexB !== -1) {
      return 1;
    }
    else {
      return 0;
    }
  });

  return arr;
}


