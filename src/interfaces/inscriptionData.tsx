export interface InscriptionData {
  data: {
    fails: Fail[]; 
    minAprobationGrade: number;
    passed: Record<string, InscripionTurno>;
    pnfId: string;
    pnfName: string;
    pnfSagaId: number;
    totalFails: number;
    totalPassed: number;
    trayectoId: string;
    trayectoName: string;
    trayectoSagaId: number;
  };
  error: boolean;
  message: string | null;
}

export interface Fail {
  grade: string;
  inscription_id: number;
  lapso_info: {
    change_end: string;
    change_start: string;
    close_date: string;
    end: string;
    end_notes: string;
    freeze_end: string;
    freeze_start: string;
    id: number;
    inscription_end: string;
    inscription_start: string;
    observations: string;
    orden: number;
    periodo: string;
    reference: string;
    reingreso_end: string;
    reingreso_start: string;
    start: string;
    start_notes: string;
    traslado_end: string;
    traslado_start: string;
  };
}


export interface InscriptionDataItem {
  id: number;
  ci: number;
  name: string;
  last_name: string;
  sex: string;
}

export interface InscripionTurno {
  id: string;
  inscriptionData: InscriptionDataItem[];
  total: number;
  turnoName: string;
  turnoSagaId: number;
}