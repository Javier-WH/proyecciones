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
}

export interface TeacherContract {
  id: string;
  contractType: string;
  hours: number;
  active: boolean;
}

