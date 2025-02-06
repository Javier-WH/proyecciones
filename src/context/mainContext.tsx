import { createContext, ReactNode, useEffect, useState } from "react";
import { MainContextValues } from "../interfaces/contextInterfaces";
import { Teacher, Quarter } from "../interfaces/teacher";
import { PNF } from "../interfaces/pnf.tsx";
import { Trayecto } from "../interfaces/trayecto.tsx";
import { Subject, SimpleSubject } from "../interfaces/subject";
import { Turno } from "../interfaces/turnos.tsx";
import AddSubjectToTeacherModal from "../components/addSubjectToTeacherModal/addSubjectToTeacherModal";
import ChangeSubjectFromTeacherModal from "../components/changeSubjectFromTeacherModal/changeSubjectFromTeacherModal";
import io, { Socket } from "socket.io-client";
import getPnf from "../fetch/getPnf.ts";
import getSubjects from "../fetch/getSubjects.ts";
import getTrayectos from "../fetch/getTrayectos.ts";
import getTurnos from "../fetch/getTurnos.ts";

export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [teachers, setTeachers] = useState<Quarter | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<"q1" | "q2" | "q3">("q1");
  const [selectedTeacerId, setSelectedTeacerId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [openAddSubjectToTeacherModal, setOpenAddSubjectToTeacherModal] = useState(false);
  const [openChangeSubjectFromTeacherModal, setOpenChangeSubjectFromTeacherModal] = useState(false);
  const [pnfList, setPnfList] = useState<PNF[] | null>(null);
  const [subjectList, setSubjectList] = useState<SimpleSubject[] | null>(null);
  const [trayectosList, setTrayectosList] = useState<Trayecto[]>([]);
  const [turnosList, setTurnosList] = useState<Turno[]>([]);
  const [proyectionsDone, setProyectionsDone] = useState<string[] | []>([]);
  const [proyectionName, setProyectionName] = useState<string | null>(null);
  const [proyectionId, setProyectionId] = useState<string | null>(null);

  useEffect(() => {
    getPnf()
      .then((data) => {
        const filteredData = data.filter((pnf: PNF) => Boolean(pnf.active) === true);
        setPnfList(filteredData);
      })
      .catch((error) => {
        console.error(error);
      });

    getSubjects()
      .then((data) => {
        const filteredData = data.filter((subject: SimpleSubject) => Boolean(subject.active) === true);
        setSubjectList(filteredData);
      })
      .catch((error) => {
        console.error(error);
      });

    getTrayectos()
      .then((data) => {
        setTrayectosList(data);
      })
      .catch((error) => {
        console.error(error);
      });

    getTurnos().then((data) => {
      setTurnosList(data);
    });
  }, []);

  const setSelectedTeacherById = (id: string) => {
    if (!teachers) return;
    const teacher = teachers[selectedQuarter].find((teacher) => teacher.id === id);
    setSelectedTeacerId(id);
    setSelectedTeacher(teacher || null);
  };

  const getTeachersHoursData = (id: number) => {
    if (!teachers)
      return {
        partTime: null,
        asignedHpours: null,
        aviableHours: null,
      };

    const subjects = teachers[selectedQuarter][id]?.load ?? [];
    const asignedHpours = subjects.reduce((acc, subject) => Number(acc) + Number(subject.hours), 0);
    const aviableHours = Number(teachers[selectedQuarter][id]?.partTime) - Number(asignedHpours);

    return {
      partTime: teachers[selectedQuarter][id]?.partTime,
      asignedHpours,
      aviableHours: aviableHours < 0 ? 0 : aviableHours,
    };
  };

  ///websocket/////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    setSocket(import.meta.env.MODE === "development" ? io("ws://localhost:3000") : io());
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Escuchar eventos de actualización de los profesores
    socket.on("updateTeachers", (newTeachers) => {
      setTeachers(newTeachers);
    });
    socket.on("updateSubjects", (newSubjects) => {
      setSubjects(newSubjects);
    });
    socket.on("proyectionsDone", (proyections) => {
      setProyectionsDone(proyections);
    });
    socket.on("proyectionData", (proyectionData) => {
      setProyectionName(proyectionData.proyectionName);
      setProyectionId(proyectionData.proyectionId);
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const handleTeacherChange = (data: Quarter) => {
    if (!socket) return;
    socket.emit("updateTeachers", data);
  };
  const handleSingleTeacherChange = (data: Teacher) => {
    if (!socket) return;
    socket.emit("updateTeacher", data);
  };
  const handleSubjectChange = (data: Subject[]) => {
    if (!socket) return;
    socket.emit("updateSubjects", data);
  };
  const handleProyectionsDoneChange = (proyections: string[]) => {
    if (!socket) return;
    socket.emit("proyectionsDone", proyections);
  };

  const values: MainContextValues = {
    teachers,
    setTeachers,
    selectedTeacher,
    setSelectedTeacher,
    setSelectedTeacherById,
    getTeachersHoursData,
    selectedTeacerId,
    setSelectedTeacerId,
    subjects,
    setSubjects,
    openAddSubjectToTeacherModal,
    setOpenAddSubjectToTeacherModal,
    openChangeSubjectFromTeacherModal,
    setOpenChangeSubjectFromTeacherModal,
    selectedSubject,
    setSelectedSubject,
    selectedQuarter,
    setSelectedQuarter,
    handleTeacherChange,
    handleSubjectChange,
    handleProyectionsDoneChange,
    pnfList,
    subjectList,
    trayectosList,
    setTrayectosList,
    turnosList,
    setTurnosList,
    proyectionsDone,
    setProyectionsDone,
    handleSingleTeacherChange,
    proyectionId,
    proyectionName,
  };

  return (
    <MainContext.Provider value={values}>
      {children}
      <AddSubjectToTeacherModal
        open={openAddSubjectToTeacherModal}
        setOpen={setOpenAddSubjectToTeacherModal}
        teachers={teachers}
        setTeachers={setTeachers}
        selectedTeacerId={selectedTeacerId}
        subjects={subjects}
        setSubjects={setSubjects}
        selectedQuarter={selectedQuarter}
        setSelectedQuarter={setSelectedQuarter}
        handleTeacherChange={handleTeacherChange}
        handleSubjectChange={handleSubjectChange}
      />
      <ChangeSubjectFromTeacherModal
        open={openChangeSubjectFromTeacherModal}
        setOpen={setOpenChangeSubjectFromTeacherModal}
        teachers={teachers}
        setTeachers={setTeachers}
        selectedTeacerId={selectedTeacerId}
        subjects={subjects}
        setSubjects={setSubjects}
        selectedSubject={selectedSubject}
        selectedQuarter={selectedQuarter}
      />
    </MainContext.Provider>
  );
};

