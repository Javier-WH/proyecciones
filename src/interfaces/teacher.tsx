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
  perfil: string[];
  gender: string;
}

