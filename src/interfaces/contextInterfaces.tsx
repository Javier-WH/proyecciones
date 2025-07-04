import { Teacher } from "../interfaces/teacher";
import { Subject, SimpleSubject } from "../interfaces/subject";
import { PNF } from "../interfaces/pnf";
import { Trayecto } from "./trayecto";
import { Turno } from "./turnos";
import { UserDataInterface } from "../interfaces/userInterfacer.tsx";

export interface MainContextValues {
  teachers: Teacher[] | null;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[] | null>>;
  selectedTeacher: Teacher | null;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>;
  setSelectedTeacherById(id: string): void;
  getTeachersHoursData(id: number): {
    partTime: number | null;
    asignedHpours: number | null;
    aviableHours: number | null;
  };
  selectedTeacerId: string | null;
  setSelectedTeacerId: React.Dispatch<React.SetStateAction<string | null>>;
  subjects: Array<Subject> | null;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  openAddSubjectToTeacherModal: boolean;
  setOpenAddSubjectToTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  openChangeSubjectFromTeacherModal: boolean;
  setOpenChangeSubjectFromTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSubject: Subject | null;
  setSelectedSubject: React.Dispatch<React.SetStateAction<Subject | null>>;
  selectedQuarter: "q1" | "q2" | "q3";
  setSelectedQuarter: React.Dispatch<React.SetStateAction<"q1" | "q2" | "q3">>;
  handleSubjectChange: (data: Subject[]) => void;
  pnfList: Array<PNF> | null;
  subjectList: Array<SimpleSubject> | null;
  trayectosList: Array<Trayecto> | null;
  setTrayectosList: React.Dispatch<React.SetStateAction<Trayecto[]>>;
  turnosList: Array<Turno> | null;
  setTurnosList: React.Dispatch<React.SetStateAction<Turno[]>>;
  handleSingleTeacherChange: (data: Teacher) => void;
  proyectionName: string | null;
  proyectionId: string | null;
  handleReload: () => void;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  userPerfil: string[] | null;
  setUserPerfil: React.Dispatch<React.SetStateAction<string[] | null>>;
  subjectColors: Record<string, string> | null;
  loadInitialData: () => void;
  editSubjectQuarter: Subject | null;
  setEditSubjectQuarter: React.Dispatch<React.SetStateAction<Subject | null>>;
  userPNF: string | null;
  setUserPNF: React.Dispatch<React.SetStateAction<string | null>>;
  userData: UserDataInterface | null;
  setUserData: React.Dispatch<React.SetStateAction<UserDataInterface | null>>;
}

