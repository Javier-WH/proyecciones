import { Days, ScheduleCommonData } from "../sechedule";
import { useEffect, useState } from "react";
import { ScheduleItem } from "../scheduleInterfaces";
import { Select, Tag } from "antd";
import "./scheduleTable.css";

export default function ScheduleTab({ data }: { data: ScheduleCommonData }) {
  const {
    schedule: scheduleRawData,
    hours,
    turnos,
    days: daysData,
    classrooms,
    subjects,
    teachers,
    pnfList,
    loadInitialData,
    trayectosList,
  } = data;

  const [days, setDays] = useState<Days[]>([]);
  const [filteredScheduleData, setFilteredScheduleData] = useState<ScheduleItem[]>([]);
  const [cellMatrix, setCellMatrix] = useState<{ rowspan: number; data: ScheduleItem | null }[][]>([]);
  const [pnfOptions, setPnfOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string>("");
  const [trayectoOptions, setTrayectoOptions] = useState<{ value: string; label: string; order: number }[]>(
    []
  );
  const [selectedTrayecto, setSelectedTrayecto] = useState<string>("");
  const [turnOptions, setTurnOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedTurn, setSelectedTurn] = useState<string>("");
  const [quarterOptions, setQuarterOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [seccionOptions, setSeccionOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedSeccion, setSelectedSeccion] = useState<string>("");

  // Llenar opciones
  useEffect(() => {
    if (
      !pnfList ||
      pnfList.length === 0 ||
      !trayectosList ||
      trayectosList.length === 0 ||
      !turnos ||
      turnos.length === 0
    )
      return;
    const pnfOpt = pnfList.map((pnf) => ({
      value: pnf.id.toString(),
      label: pnf.name.toString(),
    }));
    setPnfOptions(pnfOpt);

    const trayectoOpt = trayectosList.map((trayecto) => ({
      value: trayecto.id.toString(),
      label: trayecto.name.toString(),
      order: trayecto.order,
    }));
    setTrayectoOptions(trayectoOpt.sort((a, b) => a.order - b.order));

    const turnOpt = turnos.map((turn) => ({
      value: turn.id.toString(),
      label: turn.name.toString(),
    }));
    setTurnOptions(turnOpt);

    const aviableSeccions = new Set(subjects?.map((subject) => subject.seccion));
    const seccionOpt = Array.from(aviableSeccions).map((seccion) => ({
      value: seccion,
      label: `Sección ${seccion}`,
    }));
    setSeccionOptions(seccionOpt);

    const quarterOpt = [
      { value: "1", label: "Trimestre 1" },
      { value: "2", label: "Trimestre 2" },
      { value: "3", label: "Trimestre 3" },
    ];
    setQuarterOptions(quarterOpt);
  }, [pnfList]);

  // Filtrar datos iniciales
  useEffect(() => {
    if (
      !scheduleRawData ||
      scheduleRawData.length === 0 ||
      selectedPnf === "" ||
      selectedTrayecto === "" ||
      selectedTurn === ""
    )
      return;

    const filteredData = scheduleRawData.filter(
      (item) =>
        item.pnf_id === selectedPnf &&
        item.trayecto_id === selectedTrayecto &&
        item.turn_id === selectedTurn &&
        item.quarter === selectedQuarter &&
        item.seccion === selectedSeccion
    );

    setFilteredScheduleData(filteredData);
  }, [scheduleRawData, selectedPnf, selectedTrayecto, selectedTurn, selectedQuarter, selectedSeccion]);

  // Ordenar y filtrar días (excluir sábado y domingo)
  useEffect(() => {
    if (!daysData || daysData.length === 0) return;
    const orderedDays = daysData.sort((a: Days, b: Days) => a.index - b.index);
    const filteredDays = orderedDays.filter((day) => day.index !== 6 && day.index !== 7);
    setDays(filteredDays);
  }, [daysData]);

  // Calcular bloques consecutivos y matriz de rowSpan
  useEffect(() => {
    if (!hours || !days || !filteredScheduleData) {
      return;
    }

    // Crear matriz inicial (todas las celdas con rowspan=1 y data=null)
    const matrix = hours.map(() => days.map(() => ({ rowspan: 1, data: null })));

    // Mapa para encontrar índice de una hora por ID
    const hourIndexMap: Record<string, number> = {};
    hours.forEach((hour, idx) => {
      hourIndexMap[hour.id] = idx;
    });

    // Procesar cada día
    days.forEach((day, dayIdx) => {
      const dayItems = filteredScheduleData
        .filter((item) => item.day_id === day.id)
        .sort((a, b) => hourIndexMap[a.hours_id] - hourIndexMap[b.hours_id]);

      let currentBlock: ScheduleItem[] = [];

      for (let i = 0; i < dayItems.length; i++) {
        const item = dayItems[i];
        const prevItem = currentBlock[currentBlock.length - 1];

        // Verificar si el item es consecutivo y del mismo tipo
        if (
          prevItem &&
          hourIndexMap[item.hours_id] === hourIndexMap[prevItem.hours_id] + 1 &&
          item.subject_id === prevItem.subject_id &&
          item.teacher_id === prevItem.teacher_id &&
          item.classroom_id === prevItem.classroom_id
        ) {
          currentBlock.push(item);
        } else {
          if (currentBlock.length > 0) {
            processBlock(currentBlock, dayIdx, matrix, hourIndexMap);
          }
          currentBlock = [item];
        }
      }

      if (currentBlock.length > 0) {
        processBlock(currentBlock, dayIdx, matrix, hourIndexMap);
      }
    });

    setCellMatrix(matrix);
  }, [filteredScheduleData, hours, days]);

  // Procesar un bloque de clases consecutivas
  const processBlock = (
    block: ScheduleItem[],
    dayIdx: number,
    matrix: { rowspan: number; data: null | ScheduleItem }[][],
    hourIndexMap: Record<string, number>
  ) => {
    const startRow = hourIndexMap[block[0].hours_id];
    const rowSpan = block.length;

    // Actualizar primera celda del bloque
    matrix[startRow][dayIdx] = {
      rowspan: rowSpan,
      data: block[0],
    };

    // Marcar celdas restantes como cubiertas (rowspan=0)
    for (let i = 1; i < rowSpan; i++) {
      matrix[startRow + i][dayIdx] = {
        rowspan: 0,
        data: null,
      };
    }
  };

  // Obtener datos formateados para una celda
  const getCellData = (item: ScheduleItem) => {
    const subject = subjects?.find((s) => s.id === item.subject_id)?.subject || "Desconocido";
    const classroom = classrooms?.find((c) => c.id === item.classroom_id)?.classroom || "";
    const teacher = teachers?.find((t) => t.id === item.teacher_id);
    const teacherName = teacher ? `${teacher.name} ${teacher.lastName}` : "";

    return { subject, classroom, teacher: teacherName };
  };

  // Normalizar nombre del profesor
  const normalizeTeacherName = (teacherName: string): string => {
    return teacherName
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          gap: "20px",
        }}>
        <Select
          showSearch
          style={{ width: 200 }}
          placeholder="Selecciona un PNF"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={pnfOptions}
          value={selectedPnf}
          onChange={(value) => setSelectedPnf(value)}
        />

        <Select
          showSearch
          style={{ width: 200 }}
          placeholder="Selecciona un trayecto"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={trayectoOptions}
          value={selectedTrayecto}
          onChange={(value) => setSelectedTrayecto(value)}
        />

        <Select
          showSearch
          style={{ width: 200 }}
          placeholder="Selecciona un turno"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={turnOptions}
          value={selectedTurn}
          onChange={(value) => setSelectedTurn(value)}
        />

        <Select
          showSearch
          style={{ width: 200 }}
          placeholder="Selecciona una sección"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={seccionOptions}
          value={selectedSeccion}
          onChange={(value) => setSelectedSeccion(value)}
        />

        <Select
          showSearch
          style={{ width: 200 }}
          placeholder="Seleccione un trimestre"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={quarterOptions}
          value={selectedQuarter}
          onChange={(value) => setSelectedQuarter(value)}
        />
      </div>

      {filteredScheduleData?.length === 0 ? (
        <div
          style={{
            width: "100%",
            height: "100px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <Tag color="red">
            No hay horarios disponibles para el PNF, Trayecto, Trimestre y Sección seleccionados
          </Tag>
        </div>
      ) : (
        <table className="schedule-table">
          <thead>
            <tr>
              <th></th>
              {days?.map((day) => (
                <th key={day.id}>{day.day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours?.map((hour, rowIdx) => (
              <tr key={rowIdx}>
                <th>{hour.hours}</th>
                {days?.map((day, colIdx) => {
                  const cell = cellMatrix[rowIdx]?.[colIdx];
                  if (!cell || cell.rowspan === 0) return null;

                  const cellInfo = cell.data ? getCellData(cell.data) : null;
                  const teacherName = cellInfo ? normalizeTeacherName(cellInfo.teacher) : "";

                  return (
                    <td key={`${hour.id}-${day.id}`} rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}>
                      {cellInfo ? (
                        <div className="cell-content">
                          <span className="subject">{cellInfo.subject}</span>
                          <span className="teacher">{teacherName}</span>
                          <span className="classroom">{cellInfo.classroom}</span>
                        </div>
                      ) : (
                        <div className="cell-content"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

