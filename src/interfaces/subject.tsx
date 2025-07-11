export interface Subject {
  innerId: string;
  id: string;
  subject: string;
  hours: InlineHours;
  pnf: string;
  pnfId: string;
  seccion: string;
  quarter: InlineQuarter;
  pensum_id: string;
  trayectoId: string;
  trayectoName: string;
  trayecto_saga_id: string;
  turnoName: string;
  teacherName?: string;
  teacherCi?: string;
  key?: string;
}

export interface SimpleSubject {
  id: string;
  name: string;
  active: number;
}

export interface subjectType {
  hours: number;
  id: string;
  subject: string;
  subject_id: string;
}

export interface TableSubject {
  hours: string | null;
  key: string | null;
  quarter: string | null;
  subject: string | null;
}

export interface InlineQuarter {
  q1?: string | null;
  q2?: string | null;
  q3?: string | null;
}

export interface InlineHours {
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
}

