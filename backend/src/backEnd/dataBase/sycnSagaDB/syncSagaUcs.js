// este archivo es para sincronizar la tabla Pensum con la tabla Ucs de SAGA
import fethSubjectAPI from "#fetch/fethSubjectsAPI.js";
import Pensum from "#models/pensum.js";
import Pnf from "#models/pnf.js";
import Subjects from "#models/subjects.js";
import Trayecto from "#models/trayecto.js";

export default async function syncSagaUcs() {
  const sagaSubjects = await fethSubjectAPI({ pnfId: '', trayectoId: '', mayaId: '' });

  /*console.log(sagaSubjects.filter((item) => item.programa_info.id === 13 && item.trayecto_info.id === 1));*/

  if (sagaSubjects === null) {
    console.log("No se han podido sincronizar el pensum");
    return;
  }

  const pensumItems = [];
  try {
    for (const item of sagaSubjects) {
      const trayectoSagaId = item.trayecto_info.id;
      const trayecto = await Trayecto.findOne({
        where: { saga_id: trayectoSagaId },
        raw: true,
      });
      const trayectoId = trayecto?.id;

      const pnf = await Pnf.findOne({
        where: { saga_id: item.programa_info.id },
        raw: true,
      });
      const subject = await Subjects.findOne({
        where: { name: item?.description?.trim() },
        raw: true,
      });

      const quarteData = item?.quarters;
      const quarter = [
        ...(quarteData?.q1 === 1 ? [1] : []),
        ...(quarteData?.q2 === 1 ? [2] : []),
        ...(quarteData?.q3 === 1 ? [3] : []),
      ];

      const { total, times } = item.hours;

      let quarterHours = 0;
      let weekHours = 0;

      if (total && times && isNaN(total) === false && isNaN(times) === false) {
        quarterHours = total / times;
        weekHours = quarterHours / 12;
      }

      pensumItems.push({
        id: crypto.randomUUID(),
        pnf_id: pnf?.id ?? null,
        subject_id: subject?.id ?? null,
        trayecto_id: trayectoId,
        hours: weekHours,
        quarter: `[${String(quarter)}]`,
      });
    }

    await Pensum.bulkCreate(pensumItems, {
      fields: ["id", "pnf_id", "subject_id", "trayecto_id", "hours", "quarter"],
      updateOnDuplicate: ["hours", "quarter"],
      //ignoreDuplicates: true,
    });
    console.log("Pensum sincronizado");
  } catch (error) {
    console.log(error);
  }
}
