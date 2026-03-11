import { createContext, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { MainContextValues } from "../interfaces/contextInterfaces";
import { Teacher } from "../interfaces/teacher";
import { UserDataInterface } from "../interfaces/userInterfacer.tsx";
import { PNF } from "../interfaces/pnf.tsx";
import { Trayecto } from "../interfaces/trayecto.tsx";
import { Subject, SimpleSubject } from "../interfaces/subject";
import { Turno } from "../interfaces/turnos.tsx";
import AddSubjectToTeacherModal from "../components/addSubjectToTeacherModal/addSubjectToTeacherModal";
import ChangeSubjectFromTeacherModal from "../components/changeSubjectFromTeacherModal/changeSubjectFromTeacherModal";
import io, { Socket } from "socket.io-client";
import { Event } from "../components/SchoolSchedule/fucntions.tsx";
import { getFrozenSections, saveFrozenSections } from "../fetch/schedule/frozenSectionsFetch.ts";
import getPnf from "../fetch/getPnf.ts";
import getSubjects from "../fetch/getSubjects.ts";
import getTrayectos from "../fetch/getTrayectos.ts";
import getTurnos from "../fetch/getTurnos.ts";
import DisconectedMessage from "./disconectedMessage.tsx";
import EditSubjectQuarterModal from "../components/editSibjectQuarter/EditSubjectQuarter.tsx";

export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
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
  const [proyectionName, setProyectionName] = useState<string | null>(null);
  const [proyectionId, setProyectionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [editSubjectQuarter, setEditSubjectQuarter] = useState<Subject | null>(null);
  const [userPNF, setUserPNF] = useState<string | null>(() => {
    const savedState = sessionStorage.getItem("userPNF");
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setIsAuthenticated(true);
      return parsedState;
    }
    // Si no hay estado guardado, devuelve null
    return null;
  });
  const [userPerfil, setUserPerfil] = useState<string[] | null>(() => {
    const savedState = sessionStorage.getItem("userSesion");
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setIsAuthenticated(true);
      return parsedState;
    }
    // Si no hay estado guardado, devuelve null
    return null;
  });

  const [userData, setUserData] = useState<UserDataInterface | null>(() => {
    const savedState = sessionStorage.getItem("userData");
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setIsAuthenticated(true);
      return parsedState;
    }
    // Si no hay estado guardado, devuelve null
    return null;
  });


  const [showDisconnected, setShowDisconnected] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  const [frozenSections, setFrozenSections] = useState<Record<string, Event[]>>(() => {
    try {
      const stored = localStorage.getItem("schedule_frozenSections");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  const frozenSectionsLoadedRef = useRef(false);
  const saveFrozenTimeoutRef = useRef<number | null>(null);

  // Load frozen sections from backend when proyectionId is available
  const loadFrozenSectionsFromApi = useCallback(async () => {
    if (!proyectionId) return;
    try {
      const response = await getFrozenSections(proyectionId);
      
      // Lógica de migración: si el backend está vacío pero tenemos datos locales, 
      // priorizamos los locales y los subimos al backend.
      const hasLocalData = Object.keys(frozenSections).length > 0;
      const backendEmpty = !response?.frozenSections || Object.keys(response.frozenSections).length === 0;

      if (backendEmpty && hasLocalData) {
        console.log("Detectados datos locales sin respaldo en servidor. Sincronizando al backend...");
        await saveFrozenSections(proyectionId, frozenSections);
        // Marcamos como cargado para que el useEffect de guardado no intente dispararse de nuevo inmediatamente
        frozenSectionsLoadedRef.current = true;
      } else if (response?.frozenSections) {
        setFrozenSections(response.frozenSections);
        localStorage.setItem("schedule_frozenSections", JSON.stringify(response.frozenSections));
        frozenSectionsLoadedRef.current = true;
      } else {
        frozenSectionsLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Error loading frozen sections from API:", error);
      // En caso de error de red, permitimos que siga funcionando con lo local
      frozenSectionsLoadedRef.current = true;
    }
  }, [proyectionId, frozenSections]);

  useEffect(() => {
    // Si cambia la proyección, reseteamos la carga
    if (proyectionId) {
       frozenSectionsLoadedRef.current = false;
       loadFrozenSectionsFromApi();
    }
  }, [proyectionId]); // Quitamos loadFrozenSectionsFromApi de dependencias para evitar bucle por frozenSections

  // Save frozen sections to backend (debounced) and localStorage on every change
  useEffect(() => {
    localStorage.setItem("schedule_frozenSections", JSON.stringify(frozenSections));

    // Don't persist to backend until we've loaded from it at least once
    if (!frozenSectionsLoadedRef.current || !proyectionId) return;

    // Debounce backend save to avoid excessive API calls
    if (saveFrozenTimeoutRef.current !== null) {
      clearTimeout(saveFrozenTimeoutRef.current);
    }
    saveFrozenTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveFrozenSections(proyectionId, frozenSections);
      } catch (error) {
        console.error("Error saving frozen sections to backend:", error);
      }
    }, 500);

    return () => {
      if (saveFrozenTimeoutRef.current !== null) {
        clearTimeout(saveFrozenTimeoutRef.current);
      }
    };
  }, [frozenSections, proyectionId]);

  const [subjectColors, setSubjectColors] = useState<Record<string, string> | null>(null);

  //guarda la sesión del usuario en el local storage
  useEffect(() => {
    if (!userPerfil) return;
    sessionStorage.setItem("userSesion", JSON.stringify(userPerfil));
  }, [userPerfil]);

  useEffect(() => {
    if (!userPNF) return;
    sessionStorage.setItem("userPNF", JSON.stringify(userPNF));
  }, [userPNF]);

  useEffect(() => {
    if (!userData) return;
    sessionStorage.setItem("userData", JSON.stringify(userData));
  }, [userData]);


  useEffect(() => {
    if (!isAuthenticated) return
    console.log("cargando datos iniciales");
    loadInitialData();
  }, [isAuthenticated, userPNF, userData, userPerfil]);

  // cargar datos iniciales
  const loadInitialData = () => {
    getPnf()
      .then((data) => {
        const pnfColors: Record<string, string> = {};

        data.forEach((pnf: PNF) => {
          if (pnf.id && pnf.color) {
            pnfColors[pnf.id] = pnf.color;
          }
        });
        setSubjectColors(pnfColors);

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
  };

  const setSelectedTeacherById = (id: string) => {
    if (!teachers) return;
    const teacher = teachers.find((teacher) => teacher.id === id);
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

    const subjects = teachers[id]?.load ?? [];
    const asignedHpours = subjects.reduce((acc, subject) => Number(acc) + Number(subject.hours), 0);
    const aviableHours = Number(teachers[id]?.partTime) - Number(asignedHpours);

    return {
      partTime: teachers[id]?.partTime,
      asignedHpours,
      aviableHours: aviableHours < 0 ? 0 : aviableHours,
    };
  };

  ///websocket/////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    if (!isAuthenticated) return;
    setSocket(import.meta.env.MODE === "development" ? io("ws://localhost:3000") : io());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    const handleDisconnect = () => {

      // Configurar timeout para mostrar el mensaje después de 5 segundos
      timeoutRef.current = window.setTimeout(() => {
        setShowDisconnected(true);
      }, 5000);
    };

    const handleConnect = () => {

      setShowDisconnected(false);
      // Limpiar timeout si existe
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // Escuchar eventos de actualización de los profesores
    socket.on("updateTeachers", (newTeachers) => {
      setTeachers(newTeachers);

    });
    socket.on("updateSubjects", (newSubjects) => {
      setSubjects(newSubjects);

    });

    socket.on("proyectionData", (proyectionData) => {
      setProyectionName(proyectionData.proyectionName);
      setProyectionId(proyectionData.proyectionId);

    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
    });

    socket.on("disconnect", () => {
      handleDisconnect();
    });

    socket.on("connect", () => {
      handleConnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);


  const handleSingleTeacherChange = (data: Teacher) => {
    if (!socket) return;
    socket.emit("updateTeacher", data);
  };
  const handleSubjectChange = (data: Subject[]) => {
    if (!socket) return;
    const sanitizedData = data.map((subject) => ({
      ...subject,
      id: String(subject.id),
      innerId: String(subject.innerId),
      pnfId: String(subject.pnfId),
      pensum_id: String(subject.pensum_id),
      trayectoId: String(subject.trayectoId),
      trayecto_saga_id: String(subject.trayecto_saga_id),
    }));
    socket.emit("updateSubjects", sanitizedData);
  };


  const handleReload = () => {
    if (!socket) return;
    socket.emit("reload");
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
    handleSubjectChange,
    pnfList,
    subjectList,
    trayectosList,
    setTrayectosList,
    turnosList,
    setTurnosList,
    handleSingleTeacherChange,
    proyectionId,
    proyectionName,
    handleReload,
    isAuthenticated,
    setIsAuthenticated,
    userPerfil,
    setUserPerfil,
    subjectColors,
    loadInitialData,
    editSubjectQuarter,
    setEditSubjectQuarter,
    userPNF,
    setUserPNF,
    userData,
    setUserData,
    frozenSections,
    setFrozenSections,
  };

  return (
    <MainContext.Provider value={values}>
      {children}
      {showDisconnected && <DisconectedMessage />}
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
        handleSubjectChange={handleSubjectChange}
        selectedTeacher={selectedTeacher}
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

      <EditSubjectQuarterModal
        subject={editSubjectQuarter}
        setSubject={setEditSubjectQuarter}
        teachers={teachers || []}
        subjectColors={subjectColors}
        handleSubjectChange={handleSubjectChange}
        subjects={subjects}
      />
    </MainContext.Provider>
  );
};

