export interface Subject {
  id: string;
  subject: string;
  hours: number;
  pnf: string;
  seccion: string;
  quarter: Array<number>;
  pensum_id: string;
  trayectoId: string;
  trayectoName: string;
  trayecto_saga_id: string;
}

export interface SimpleSubject {
  id: string;
  name: string;
  active: number;
}