import getInscriptionData from "../../../fetch/getInscriptionData";
import { useEffect, useState, useContext } from "react";
import { InscriptionData, InscripionTurno } from "../../../interfaces/inscriptionData";
import { Tag, Slider, message, Card, Button, Popconfirm } from "antd";
import getPensum from "../../../fetch/getPensum";
import Spinner from "../../spinner/spinner";
import { subjectType, Subject, InlineQuarter, InlineHours } from "../../../interfaces/subject";
import ShowArrayModal from "../../SowArrayModal/showArrayModal";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "./NewProyectionContainer.css";
import {
  CloseCircleOutlined,
  AppstoreAddOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

export default function NewProyectionContainer({
  programaId,
  trayectoId,
  trayectoDataValue,
}: {
  programaId: string | null | undefined;
  trayectoId: string | null | undefined;
  trayectoDataValue: string | null | undefined;
}) {
  interface Pensum {
    hours: number;
    id: string;
    quarter: Array<number>;
    subject: string;
    subject_id: string;
    trayecto_saga_id: number;
  }

  const { subjects, handleSubjectChange } = useContext(
    MainContext
  ) as MainContextValues;
  const [inscriptionData, setInscriptionData] = useState<InscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [passed, setPassed] = useState<Record<string, InscripionTurno> | null>(null);
  const [turnos, setTurnos] = useState<Array<{
    turnoName: string;
    seccions: number;
    total: number;
  } | null> | null>(null);
  const [modalArrayList, setModalArrayList] = useState<string[] | null>(null);
  const [pensumSlist, setPensumSlist] = useState<string[] | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [errorShown, setErrorShown] = useState(false);
  const [pensum, setPensum] = useState<Pensum[] | null>(null);
  const [pensumTrayectoName, setPensumTrayectoName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!programaId || !trayectoId) return;
    setLoading(true);
    setTurnos(null);
    getInscriptionData({
      programId: programaId,
      trayectoId: trayectoDataValue ? trayectoDataValue : trayectoId,
      //trayectoId: trayectoId,
    })
      .then((data) => setInscriptionData(data))
      .catch((error) => console.log(error));

    getPensum({ programaId, trayectoId })
      .then((data) => {
        if (data.error) {
          setPensumTrayectoName("no hay pensum");
          setPensumSlist([]);
          setPensum(null);
        } else {
          setPensumTrayectoName(data?.data?.trayectoName);
          setPensumSlist(data?.data?.pensums.map((subject: subjectType) => subject.subject));
          setPensum(data?.data?.pensums);
        }
      })
      .catch((error) => console.log(error));
    //.finally(() => setLoading(false));
  }, [programaId, trayectoId, trayectoDataValue]);

  useEffect(() => {
    if (!inscriptionData) {
      setPassed(null);
      return;
    }
    setPassed(inscriptionData?.data?.passed);
  }, [inscriptionData]);

  useEffect(() => {
    if (!passed) return;
    const _turnos = Object.keys(passed).map((key) => {
      const turnoData = {
        turnoName: passed[key].turnoName,
        total: passed[key].total,
        seccions: 1,
      };
      return turnoData;
    });

    const ordenTurnos = { Mañana: 1, Tarde: 2, Noche: 3, Diurno: 4 };

    _turnos.sort((a, b) => {
      const prioridadA = ordenTurnos[a.turnoName as keyof typeof ordenTurnos] || 5; // Valores no definidos van al final
      const prioridadB = ordenTurnos[b.turnoName as keyof typeof ordenTurnos] || 5;
      return prioridadA - prioridadB;
    });

    setTurnos(_turnos);
    setLoading(false);
  }, [passed]);

  const onChangeSlider = (value: number, index: number, totalInscriptions: number) => {
    if (totalInscriptions / value < 1) {
      if (!errorShown) {
        // Verifica si el mensaje ya se mostró
        message.error("No hay suficientes estudiantes para una nueva sección");
        setErrorShown(true); // Marca el mensaje como mostrado
      }
      return;
    } else {
      setErrorShown(false); // Resetea el estado si se puede cambiar el valor
    }

    if (!turnos) return;
    const _turnos = [...turnos];
    if (_turnos[index] === null) return;
    _turnos[index].seccions = value;
    setTurnos(_turnos);
  };

  const handlePensum = () => {
    if (!pensumSlist || !inscriptionData) return;
    setModalArrayList(pensumSlist ?? []);
    const pnfName = inscriptionData.data.pnfName;
    setModalTitle(`Pensum de ${pnfName} - ${pensumTrayectoName}`);
    setOpenModal(true);
  };

  const handleStudents = () => {
    if (!passed || !inscriptionData || !subjects) return;
    const studentList: string[] = [];

    Object.keys(passed).forEach((key) => {
      const list = passed[key].inscriptionData.map((student) => {
        const name = `${student.last_name} ${student.name}`
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return `${name} - CI: ${student.ci}`;
      });
      studentList.push(...list);
    });

    setModalArrayList(studentList);
    const pnfName = inscriptionData.data.pnfName;
    const trayectoName = inscriptionData.data.trayectoName;
    setModalTitle(`Estudiantes inscritos en ${pnfName} - ${trayectoName}`);
    setOpenModal(true);
  };

  const handleProyecction = () => {
    if (!turnos || !pensum || !inscriptionData || !trayectoId) return;
    let list: Subject[] | [] = [];
    let currentSection = 1;

    // Separar y ordenar turnos
    const manana = turnos.find((t) => t?.turnoName === "Mañana");
    const tarde = turnos.find((t) => t?.turnoName === "Tarde");
    const otrosTurnos = turnos.filter(
      (t) => t?.turnoName !== "Mañana" && t?.turnoName !== "Tarde"
    );

    // Crear orden de procesamiento: Mañana -> Tarde -> Otros
    const procesamientoOrdenado = [];
    if (manana) procesamientoOrdenado.push(manana);
    if (tarde) procesamientoOrdenado.push(tarde);
    procesamientoOrdenado.push(...otrosTurnos);

    // Procesar cada turno
    procesamientoOrdenado.forEach((turno) => {
      const totalSecciones = turno?.seccions ?? 0;
      const esContinuo = ["Mañana", "Tarde"].includes(turno?.turnoName ?? "");

      if (esContinuo) {
        // Numeración continua para Mañana/Tarde
        for (let i = 0; i < totalSecciones; i++) {
          const sectionNumber = currentSection++;
          const subList = pensum.map((subject) => {
            const quarter: InlineQuarter = {};
            const hours: InlineHours = { q1: 0, q2: 0, q3: 0 };
            const subjectedQuarter = JSON.parse(subject.quarter.toString());

            if (subjectedQuarter.includes(1)) {
              quarter.q1 = null;
              hours.q1 = subject.hours;
            }
            if (subjectedQuarter.includes(2)) {
              quarter.q2 = null;
              hours.q2 = subject.hours;
            }
            if (subjectedQuarter.includes(3)) {
              quarter.q3 = null;
              hours.q3 = subject.hours;
            }

            return {
              innerId: uuidv4(),
              id: subject.subject_id,
              subject: subject.subject,
              hours: hours,
              pnf: inscriptionData.data.pnfName,
              pnfId: inscriptionData.data.pnfId,
              seccion: `${sectionNumber}`,
              quarter: quarter,
              pensum_id: subject.id,
              turnoName: turno?.turnoName ?? "Indeterminado",
              trayectoId: trayectoId,
              trayectoName: pensumTrayectoName,
              trayecto_saga_id: subject.trayecto_saga_id.toString(),
            };
          });
          list = [...list, ...subList];
        }
      } else {
        // Numeración independiente para otros turnos
        for (let i = 1; i <= totalSecciones; i++) {
          const subList = pensum.map((subject) => {
            const quarter: InlineQuarter = {};
            const hours: InlineHours = { q1: 0, q2: 0, q3: 0 };
            const subjectedQuarter = JSON.parse(subject.quarter.toString());

            if (subjectedQuarter.includes(1)) {
              quarter.q1 = null;
              hours.q1 = subject.hours;
            }
            if (subjectedQuarter.includes(2)) {
              quarter.q2 = null;
              hours.q2 = subject.hours;
            }
            if (subjectedQuarter.includes(3)) {
              quarter.q3 = null;
              hours.q3 = subject.hours;
            }

            return {
              innerId: uuidv4(),
              id: subject.subject_id,
              subject: subject.subject,
              hours: hours,
              pnf: inscriptionData.data.pnfName,
              pnfId: inscriptionData.data.pnfId,
              seccion: `${i}`,
              quarter: quarter,
              pensum_id: subject.id,
              turnoName: turno?.turnoName ?? "Indeterminado",
              trayectoId: trayectoId,
              trayectoName: pensumTrayectoName,
              trayecto_saga_id: subject.trayecto_saga_id.toString(),
            };
          });
          list = [...list, ...subList];
        }
      }
    });

    handleSubjectChange([...(subjects ?? []), ...(list ?? [])]);

    
    message.success("Proyección generada con exito");
    navigate("/app/proyecciones");
  };



  // si no hay materias, no se puede generar la proyeccion
  if (pensumSlist?.length === 0) {
    return (
      <div style={{ margin: "20px", display: "flex", flexDirection: "column", rowGap: "10px" }}>
        <Tag icon={<CloseCircleOutlined />} color="error">
          No hay materias en el pensum
        </Tag>
      </div>
    );
  }

  let morningSeccions = 0;
  console.log(turnos);
  return (
    <div>
      <ShowArrayModal
        arrayList={modalArrayList ?? []}
        isModalOpen={openModal}
        setIsModalOpen={setOpenModal}
        title={modalTitle}
      />
      {loading ? (
        <Spinner />
      ) : (
        <div style={{ margin: "20px", display: "flex", flexDirection: "column", rowGap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 4.7fr", gap: "20px" }}>
            <Popconfirm
              placement="bottom"
              title={"¿Deseas generar esta proyección?"}
              description={"Esta accion no se puede deshacer"}
              okText="Si"
              cancelText="No"
              onConfirm={handleProyecction}>
              <Button
                type="primary"
                icon={<AppstoreAddOutlined />}
                size={"large"}
                disabled={!turnos || turnos.length === 0}>
                Generar
              </Button>
            </Popconfirm>

            <Button type="primary" icon={<OrderedListOutlined />} size={"large"} onClick={handlePensum}>
              Pensum
            </Button>
            <Button
              type="primary"
              icon={<UnorderedListOutlined />}
              size={"large"}
              onClick={handleStudents}
              disabled={!turnos || turnos.length === 0}>
              Estudiantes
            </Button>
          </div>

          {!turnos || turnos.length === 0 ? (
            <Tag icon={<CloseCircleOutlined />} color="error">
              No se encontrarion inscripciones
            </Tag>
          ) : (
            turnos.map((turno, i) => (
              <div
                key={turno?.turnoName}
                style={{
                  display: "flex",
                  gap: "20px",
                  backgroundColor: "#001529",
                  color: "white",
                  padding: "10px",
                  borderRadius: "10px",
                }}>
                <div>
                  <h1>{turno?.turnoName}</h1>
                  <p>{turno?.total} Estudiantes Inscritos</p>
                  <div
                    className="new-proyection-slider"
                    style={{
                      width: "300px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                    <span>{turno?.seccions} secciones</span>
                    <Slider
                      style={{ width: "200px" }}
                      min={1}
                      max={20}
                      onChange={(e) => onChangeSlider(e, i, turno?.total || 0)}
                      value={turno?.seccions}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {new Array(turno?.seccions || 0).fill(0).map((_turno, j) => {
                    const totalEstudiantes = turno?.total || 0;
                    const secciones = turno?.seccions || 1; // Evitar división por cero
                    if (turno?.turnoName.toLocaleLowerCase() === "mañana") {
                      morningSeccions++;
                    }
                    // Calcular cuántos estudiantes por sección
                    const estudiantesPorSeccion = Math.floor(totalEstudiantes / secciones);
                    const seccionesConMasEstudiantes = totalEstudiantes % secciones; // Resto para distribuir

                    // Determinar el número de estudiantes en esta sección
                    const estudiantesEnEstaSeccion =
                      j < seccionesConMasEstudiantes ? estudiantesPorSeccion + 1 : estudiantesPorSeccion;

                    const seccion =
                      turno?.turnoName.toLocaleLowerCase() === "mañana"
                        ? morningSeccions
                        : turno?.turnoName.toLocaleLowerCase() === "tarde"
                        ? morningSeccions + 1 + j
                        : j + 1;
                    return (
                      <Card key={j} title={`Sección ${seccion}`} size="small" style={{ width: 300 }}>
                        <p>{`Número de Estudiantes: ${estudiantesEnEstaSeccion}`}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

