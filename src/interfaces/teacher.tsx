import { Subject } from "./subject";

export interface Teacher {
  id: string;
  name: string;
  lastName: string;
  ci: string;
  type: object;
  photo: string | null;
  title: string;
  partTime: number;
  load: Array<Subject> | null;
  perfil: string[];
}

