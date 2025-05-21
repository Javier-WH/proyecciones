import { Tabs, message } from "antd";
import getPensum from "../../../fetch/getPensum";
import getInscriptionData from "../../../fetch/getInscriptionData";
import { useEffect, useState } from "react";
import { Subject, InlineQuarter, InlineHours } from "../../../interfaces/subject";
import { v4 as uuidv4 } from "uuid";
import TabSubject from "./tabs/tabSubject";
import TabStudent from "./tabs/tabStudent";

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
  const [subjectList, setSubjectList] = useState<Subject[]>([]);
  const [studentList, setStudentList] = useState<StudentList | null>(null);

  useEffect(() => {
    if (!selectedPnf || !selectedTrayecto) return;

    // se obtiene la lista de materias
    getPensum({ programaId: selectedPnf, trayectoId: selectedTrayecto })
      .then((data) => {
        if (data.error) {
          message.error(data.message);
          setSubjectList([]);
          return;
        }

        const { pnfId, pnfName, trayectoId, trayectoName, pensums } = data.data;

        const pensumList: Subject[] = pensums.map((subject) => {
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

          const newSubject: Subject = {
            innerId: uuidv4(),
            id: subject.subject_id,
            subject: subject.subject,
            hours: hours,
            pnf: pnfName,
            pnfId: pnfId,
            seccion: "undefined",
            quarter: quarter,
            pensum_id: subject.id,
            turnoName: subject.turnoName, //
            trayectoId: trayectoId,
            trayectoName: trayectoName,
            trayecto_saga_id: subject.trayecto_saga_id.toString(),
          };
          return newSubject;
        });

        setSubjectList(pensumList);
      })
      .catch((error) => {
        console.log(error);
      });

    // se obtiene la lista de alumnos
    getInscriptionData({ programId: selectedPnf, trayectoId: selectedTrayecto })
      .then((data) => {
        if (data.error) {
          message.error(data.message);
          setStudentList(null);
          return;
        }
        const studentsPassedObject = data?.data?.passed || {};

        const turnos = Object.keys(studentsPassedObject);
        const studentPassedList = turnos
          .map((turno) => {
            return studentsPassedObject[turno].inscriptionData;
          })
          .flat();

        const studentFailedList =
          data?.data?.fails?.map((student: any) => {
            return student.student_info;
          }) || [];

        setStudentList({ pass: studentPassedList, fail: studentFailedList });
      })
      .catch((error) => {
        console.log(error);
      });
  }, [selectedPnf, selectedTrayecto]);

  return (
    <Tabs
      defaultActiveKey="1"
      items={[
        {
          label: "Proyección",
          key: "1",
          children: "Tab 1",
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
          children: "Tab 4",
        },
      ]}
    />
  );
}

