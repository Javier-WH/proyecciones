import { Subject } from "./subject";

export interface Teacher {
  id: string;
  name: string;
  lastName: string;
  ci: string;
  type: string;
  photo: string | null;
  title: string;
  partTime: number;
  load: Array<Subject> | null;
  perfilName: string;
  perfil_name_id: string;
  perfil: string[];
  gender: string;
  genderId: string;
  contractTypeId: string;
  active: boolean;
  PNF?: string | undefined;
  is_placeholder?: boolean;
}

export interface TeacherContract {
  id: string;
  contractType: string;
  hours: number;
  active: boolean;
}
export interface TeacherRestriction {
  teacherId: string;
  days: number[];
  hours: { day: number; start: string; end: string }[];
}

export interface SubjectRestriction {
  subjectKey: string;
  subjectName: string;
  classroomIds: string[];
  pnfId?: string;
  isExclusive?: boolean;
  splitHours?: boolean;
}
