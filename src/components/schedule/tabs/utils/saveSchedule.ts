import { InsertSchedule } from "../../../../fetch/schedule/scheduleFetch";
import { Subject } from "../../../../interfaces/subject";
import { ScheduleItem } from "../../scheduleInterfaces";

export default async function SaveSchedule(scheduleData: ScheduleItem[], subjects: Subject[]) {
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < scheduleData.length; i += batchSize) {
    const batch = scheduleData.slice(i, i + batchSize);

    try {
      const response = await InsertSchedule(batch);
      if (response.error) {
        console.error("Error en lote:", response.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    } catch (error) {
      console.error("Error en lote:", error);
      errorCount += batch.length;
    }
  }

  // Mostrar resumen
  if (errorCount > 0) {
    return {
      error: true,
      message: `Horario parcialmente generado: ${successCount} materias asignadas, ${errorCount} fallidas`,
    };
  } else {
    return {
      error: false,
      message: `Horario generado con ${successCount}/${subjects.length} materias asignadas`,
    };
  }
}
