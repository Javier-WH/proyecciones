import { useContext } from "react";
import { Button } from "antd";
import { RiFileExcel2Line } from "react-icons/ri";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import * as XLSX from 'xlsx';
import { Teacher } from "../../interfaces/teacher";

const iconStyle = { color: "white", fontSize: "2rem" };

export default function Excel() {

  const { teachers } = useContext(MainContext) as MainContextValues
  // esta funcion aplana los arrays de profesores uniendo sus cargas academicas para poder ser procesadas
  function mergeLoad(array1: Teacher[], array2: Teacher[], array3: Teacher[]): Teacher[] {
    const datosCombinados: Record<string, Teacher> = {};
    function procesarArray(array: Teacher[]) {
      array.forEach((item: Teacher) => {
        const ci = item.ci;

        if (datosCombinados[ci]) {
          const loadExistente = datosCombinados[ci].load;
          const loadNuevo = item.load || [];

          loadNuevo.forEach(nuevoItem => {
            const esDuplicado = loadExistente?.some(existenteItem =>
              existenteItem.id === nuevoItem.id &&
              existenteItem.pensum_id === nuevoItem.pensum_id &&
              existenteItem.pnf === nuevoItem.pnf &&
              existenteItem.trayectoId === nuevoItem.trayectoId &&
              existenteItem.turnoName === nuevoItem.turnoName &&
              existenteItem.seccion === nuevoItem.seccion
            );

            if (!esDuplicado) {
              loadExistente?.push(nuevoItem);
            }
          });
        } else {
          datosCombinados[ci] = { ...item };
        }
      });
    }

    procesarArray(array1);
    procesarArray(array2);
    procesarArray(array3);

    return Object.values(datosCombinados);
  }

  function generateExcelData(profesores: Teacher[]) {
    const data = [
      [{ v: 'PERSONAL DOCENTE', t: 's', s: { alignment: { horizontal: 'center' }, font: { bold: true, size: 16 } } }],
      [],
      ['Profesor', 'Unidad Curricular', 'Trayecto', 'Sección', 'Turno', 'U/C', 'Total de Horas', 'TRIM I', 'Horas por U/C', 'TRIM II', 'Total de Horas', 'Horas por U/C', 'TRIM III', 'Total de Horas', 'Dedicación', 'Observación']
    ];

    const merges: { s: { r: number, c: number }, e: { r: number, c: number }, style: { alignment: { vertical: string, horizontal: string} } }[] = [];

    profesores.forEach(profesor => {
      const startRow = data.length; // Row where the professor's data starts

      if (profesor.load && profesor.load.length > 0) {
        profesor.load.forEach(carga => {
          data.push([
            `${profesor.lastName} ${profesor.name}`,
            carga.subject,
            carga.trayectoName,
            carga.seccion,
            carga.turnoName,
            '',
            String(carga.hours),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            profesor.type,
            ''
          ]);
        });
      } else {
        data.push([
          profesor.name,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          profesor.type,
          ''
        ]);
      }

      const endRow = data.length - 1; // Row where the professor's data ends

      // Merge cells for professor's name and type
      // Merge cells and center vertically
      merges.push({
        s: { r: startRow, c: 0 },
        e: { r: endRow, c: 0 },
        style: {
          alignment: {
            vertical: "center",
            horizontal: "center"
        } } // Add vertical centering
      });
      
      merges.push({
        s: { r: startRow, c: 14 },
        e: { r: endRow, c: 14 },
        style: { alignment: { vertical: 'center', horizontal: 'center' } } // Add vertical centering and horizontal centering
      });
      
    });

    return { data, merges };
  }

  const handleClick = () => {
    if (!teachers) return;
    const plainTeachers = mergeLoad(teachers.q1, teachers.q2, teachers.q3);
    // los profesores que no tienen carga son excluidos
    const cleanTeachers = plainTeachers.filter((teacher) => teacher.load && teacher.load.length > 0);
    const { data, merges } = generateExcelData(cleanTeachers)
    handleExport(data, merges);
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const handleExport = (data: any[], merges: any[]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(data);

  
    worksheet['!cols'] = [
      { wch: 60,}, // profesor
      { wch: 50 }, // Unidad Curricular
      { wch: 25 }, // Trayecto
      { wch: 10 }, // Seccion
      { wch: 10 }, // Turno
      { wch: 5 }, // U/C
      { wch: 7 }, // Total de Horas
      { wch: 5 }, // TRIM I
      { wch: 5 }, // Horas por U/C
      { wch: 5 }, // TRIM II
      { wch: 5 }, // Total de Horas
      { wch: 5 }, // Horas por U/C
      { wch: 5 }, // TRIM III
      { wch: 5 }, // Total de Horas
      { wch: 25 }, // Dedicación
      { wch: 25 }, // Observación
  
    ];

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }, ...merges]; // Add professor merges

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hoja 1');
    XLSX.writeFile(workbook, 'datos.xlsx');
  };

  return <div style={{ display: "flex", alignItems: "center", columnGap: "20px" }}>
    <Button type="link" shape="circle" icon={<RiFileExcel2Line />} style={iconStyle} onClick={handleClick} />
  </div>
}