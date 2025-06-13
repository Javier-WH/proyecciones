/* eslint-disable @typescript-eslint/no-explicit-any */
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Button, Tabs, message, Divider, Popconfirm, Spin, Tag } from "antd";
import getPensum from "../../../fetch/getPensum";
import getInscriptionData from "../../../fetch/getInscriptionData";
import { useContext, useEffect, useState } from "react";
import { Subject, InlineQuarter, InlineHours } from "../../../interfaces/subject";
import { v4 as uuidv4 } from "uuid";
import TabSubject from "./tabs/tabSubject";
import TabStudent from "./tabs/tabStudent";
import TabProyection from "./tabs/tabProyection";
import TabConf from "./tabs/tabConf";
import { ExclamationCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import getConfig from "../../../fetch/getConfig";
import { useNavigate } from "react-router-dom";

interface TabPanelProps {
  selectedPnf: string | null;
  selectedTrayecto: string | null;
}

export interface Student {
  ci: string;
  id: string;
  last_name: string;
  name: string;
  sex: string;
}

export interface StudentList {
  pass: Student[];
  fail: Student[];
}

export default function TabPanel({ selectedPnf, selectedTrayecto }: TabPanelProps) {
  const { turnosList: defaultTurnos, subjects, handleSubjectChange, userData } = useContext(MainContext) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>([]);
  const [studentList, setStudentList] = useState<StudentList | null>(null);
  const [turnosList, setTurnosList] = useState<string[]>([]);
  const [turnos, setTurnos] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isActiveProyection, setIsActiveProyection] = useState<boolean | null>(null);
  const navigate = useNavigate();
  // obtener la proyeccion activa
  useEffect(()=>{
        getConfig()
        .then((config) => setIsActiveProyection(config.active_proyection))
        .catch((error) => {
          console.error(error);
          setIsActiveProyection(null)
        });
  },[]);

  //  llena los turnos que son utilizados en la pestana de proyeccion
  useEffect(() => {
    if (!turnosList) return;
    setTurnos(turnosList);
  }, [turnosList]);

  // llena el array de turnos con los valores de defaultTurnos
  useEffect(() => {
    if (!defaultTurnos) return;
    const turnos = defaultTurnos.map((turno: any) => turno.name);
    setTurnosList(turnos);
  }, [defaultTurnos]);


  useEffect(() => {
    if (!selectedPnf || !selectedTrayecto) return;

    setLoading(true);

    const fetchAllData = async () => {
      try {
        // Ejecutamos ambas peticiones en paralelo
        const [pensumData, inscriptionData] = await Promise.all([
          getPensum({ programaId: selectedPnf, trayectoId: selectedTrayecto }),
          getInscriptionData({ programId: selectedPnf, trayectoId: selectedTrayecto })
        ]);

        // Procesamiento de materias
        if (pensumData.error) {

          setSubjectList([]);
        } else {
          const { pnfId, pnfName, trayectoId, trayectoName, pensums } = pensumData.data;

          const pensumList: Subject[] = pensums.map((subject: any) => {
            const quarter: InlineQuarter = {};
            const hours: InlineHours = { q1: 0, q2: 0, q3: 0 };
            const subjectedQuarter = JSON.parse(subject.quarter.toString());

            [1, 2, 3].forEach((q) => {
              if (subjectedQuarter.includes(q)) {
                quarter[`q${q}` as keyof InlineQuarter] = null;
                hours[`q${q}` as keyof InlineHours] = Number(subject.hours) || 0;
              }
            });

            return {
              innerId: uuidv4(),
              id: subject.subject_id,
              subject: subject.subject,
              hours: hours,
              pnf: pnfName,
              pnfId: pnfId,
              seccion: "undefined",
              quarter: quarter,
              pensum_id: subject.id,
              turnoName: "undefined",
              trayectoId: trayectoId,
              trayectoName: trayectoName,
              trayecto_saga_id: subject.trayecto_saga_id.toString(),
            };
          });
          setSubjectList(pensumList);
        }

        // Procesamiento de estudiantes
        if (inscriptionData.error) {
          message.error(inscriptionData.message);
          setStudentList(null);
        } else {
          const studentsPassedObject = inscriptionData?.data?.passed || {};
          const turnos = Object.keys(studentsPassedObject);
          setTurnosList(turnos);

          const studentPassedList = turnos
            .map((turno) => studentsPassedObject[turno].inscriptionData)
            .flat();

          const studentFailedList = inscriptionData?.data?.fails?.map(
            (student: any) => student.student_info
          ) || [];

          setStudentList({ pass: studentPassedList, fail: studentFailedList });
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Error al cargar los datos");
      } finally {
        setLoading(false); // Desactivamos el loading al final
      }
    };

    fetchAllData();
  }, [selectedPnf, selectedTrayecto]);

  // funcion que se encarga revisar si una proyeccion ya existe
  const checkIfProyected = () => {
    const isProyected = subjects?.some((subject) => {
      if (subject.pnfId === selectedPnf && subject.trayectoId === selectedTrayecto) {
        return true;
      }
    })
    return isProyected
  }

  const handleDeleteProyected = () => {
    if (!subjects || !selectedPnf || !selectedTrayecto) return;
    const subjectsCopy = JSON.parse(JSON.stringify(subjects));
    const filteredSubjects = subjectsCopy.filter((subject: Subject) => {
      return subject.pnfId !== selectedPnf || subject.trayectoId !== selectedTrayecto;
    });


    handleSubjectChange(filteredSubjects);
  }

  if(!isActiveProyection){
    return <div>
      <h2 style={{ color: 'red' }}>No hay ninguna proyección activa</h2>
      <Divider />
      {
        userData?.su ? <Button type="primary" onClick={() => navigate("/app/active")}>Crear proyección</Button> : <p>Solo los administradores del sistema pueden crear una proyección, habla con uno de ellos</p>
      }
      
    </div>
  }

  if (checkIfProyected()) {
    return <div>
      <h2>Esta proyección ya ha sido creada</h2>
      <p>Si desea crear una nueva proyección para este programa y trayecto, elimine la proyección existente.</p>
      <Divider />
      <Popconfirm
        placement="bottom"
        title={"¿Deseas eliminar esta proyección?"}
        description={"Esta accion no se puede deshacer, se perderán todos los cambios realizados en la proyección de manera permanente."}
        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
        okText="Eliminar"
        cancelText="Cancelar"
        okType="danger"
        onCancel={() => message.info("No se ha eliminado la proyección")}
        onConfirm={handleDeleteProyected}>
        <Button type="primary" danger>Eliminar proyección</Button>
      </Popconfirm>
    </div>
  }
  
  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", columnGap: "20px" }}>
      <Spin size="large" />
      <h2 style={{ color: "#1890ff" }}>Espere...</h2>
    </div>
  }

  if (selectedPnf === null || selectedTrayecto === null) {
    return <div>
      <h2 style={{ color: "gray" }}>Seleccione un programa y trayecto</h2>
    </div>
  }


  if (subjectList.length === 0 || subjectList === null) {
    return <div>
      <h2 style={{ color: "gray" }}>No hay materias registradas para este programa y trayecto</h2>
    </div>
  }



  return <div>
    {
      studentList?.pass?.length === 0 && <Tag icon={<ExclamationCircleOutlined />} color="red">No hay estudiantes inscritos en este trayecto</Tag>
    }
    <Tabs
      defaultActiveKey="1"
      items={[
        {
          label: "Proyección",
          key: "1",
          children: <TabProyection subjectList={subjectList} turnos={turnos} />,
        },
        {
          label: "Materias",
          key: "2",
          children: <TabSubject subjects={subjectList} />,
        },
        {
          label: "Alumnos",
          key: "3",
          children: <TabStudent students={studentList} />,
        },
        {
          label: "Configuración",
          key: "4",
          children: <TabConf turnosList={defaultTurnos?.map((turno: any) => turno.name) || []} turnos={turnos} setTurnos={setTurnos} />,
        },
      ]}
    />
  </div>

}


