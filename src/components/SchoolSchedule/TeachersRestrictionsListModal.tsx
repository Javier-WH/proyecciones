import { useContext, useState, useMemo } from "react";
import { Modal, Select, Table, Tag, Empty, Button, Tabs } from "antd";
import { FaUsers } from "react-icons/fa6";
import styles from "./modal.module.css";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { TeacherRestriction } from "../../interfaces/teacher";

const TeachersRestrictionsListModal: React.FC<{
  restrictions: TeacherRestriction[];
}> = ({ restrictions }) => {
  const { teachers, pnfList, subjectColors } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPnfId, setSelectedPnfId] = useState<string | null>(null);

  const teacherMap = useMemo(() => {
    const map = new Map();
    teachers?.forEach((t) => map.set(t.id, t));
    return map;
  }, [teachers]);

  const pnfOptions = useMemo(() => {
    if (!pnfList) return [];
    return pnfList.map((pnf) => ({ value: pnf.id, label: pnf.name }));
  }, [pnfList]);

  const filteredTeachersWithRestrictions = useMemo(() => {
    if (!restrictions) return [];

    return restrictions
      .map((r) => {
        const teacher = teacherMap.get(r.teacherId);
        if (!teacher) return null;

        // The teacher.PNF field seems to contain the ID based on user feedback/screenshot
        const teacherPnfId = teacher.PNF;

        // Filter out those with NO restrictions at all (empty days and empty hours)
        const hasDays = r.days && r.days.length > 0;
        const hasHours = r.hours && r.hours.length > 0;
        if (!hasDays && !hasHours) return null;

        // Filter by PNF if selected.
        if (selectedPnfId && teacherPnfId !== selectedPnfId) {
          return null;
        }

        const pnfObj = pnfList?.find(p => p.id === teacherPnfId);
        const pnfName = pnfObj?.name || "N/A";
        // Use color from context if available
        const pnfColor = (teacherPnfId && subjectColors?.[teacherPnfId]) || pnfObj?.color || "#ccc";

        return {
          ...r,
          teacherName: `${teacher.name} ${teacher.lastName}`,
          pnfName,
          pnfColor,
        };
      })
      .filter(Boolean);
  }, [restrictions, teacherMap, selectedPnfId, pnfList, subjectColors]);

  const dayLabels = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const columns = [
    {
      title: "Profesor",
      dataIndex: "teacherName",
      key: "teacherName",
      sorter: (a: any, b: any) => a.teacherName.localeCompare(b.teacherName),
      render: (text: string, record: any) => (
        <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
          <div
            style={{
              width: "4px",
              backgroundColor: record.pnfColor,
              borderRadius: "2px",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 600 }}>{text}</span>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>{record.pnfName}</span>
          </div>
        </div>
      )
    },
    {
      title: "Días Completos",
      dataIndex: "days",
      key: "days",
      render: (days: number[]) =>
        days.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {days.map((d) => (
              <Tag color="red" key={d}>
                {dayLabels[d]}
              </Tag>
            ))}
          </div>
        ) : (
          <span style={{ color: "#9ca3af", fontSize: "0.85em" }}>Sin días restringidos</span>
        ),
    },
    {
      title: "Horas Restringidas",
      dataIndex: "hours",
      key: "hours",
      render: (hours: any[]) => {
        if (!hours || hours.length === 0) {
          return <span style={{ color: "#9ca3af", fontSize: "0.85em" }}>Sin horas restringidas</span>;
        }

        // Group hours by day
        const hoursByDay = hours.reduce((acc: Record<number, any[]>, h) => {
          if (!acc[h.day]) acc[h.day] = [];
          acc[h.day].push(h);
          return acc;
        }, {});

        const sortedDays = Object.keys(hoursByDay).map(Number).sort((a, b) => a - b);

        return (
          <Tabs
            size="small"
            type="card"
            style={{ width: "500px" }}
            items={sortedDays.map((day) => ({
              key: String(day),
              label: dayLabels[day],
              children: (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  padding: "8px 0",
                  height: "100px",  // Altura fija
                  overflowY: "auto", // Scroll si hay muchas horas
                  alignContent: "flex-start"
                }}>
                  {hoursByDay[day].map((h, i) => (
                    <Tag key={i} style={{ margin: 0, height: "fit-content" }}>
                      {h.start} - {h.end}
                    </Tag>
                  ))}
                </div>
              ),
            }))}
          />
        );
      },
    },
  ];

  return (
    <>
      <FaUsers
        title="Ver profesores con restricciones"
        style={{
          fontSize: "2.5rem",
          color: "rgb(55, 174, 221)",
          cursor: "pointer",
          padding: "6px",
          borderRadius: "4px",
          transition: "all 0.2s"
        }}
        onClick={() => setIsModalOpen(true)}
      />
      <Modal
        title="Profesores con Restricciones Configuradas"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Cerrar
          </Button>
        ]}
        width={950}
      >
        <div style={{ marginBottom: "20px" }}>
          <span style={{ fontWeight: 500, fontSize: "0.9rem", color: "#374151" }}>Filtrar por PNF:</span>
          <Select
            allowClear
            placeholder="Todos los PNF"
            style={{ width: "100%", marginTop: "5px" }}
            options={pnfOptions}
            onChange={setSelectedPnfId}
            value={selectedPnfId}
          />
        </div>

        <Table
          dataSource={filteredTeachersWithRestrictions as any}
          columns={columns}
          rowKey="teacherId"
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          size="middle"
          locale={{
            emptyText: (
              <Empty description="No se encontraron profesores con restricciones para el filtro seleccionado" />
            ),
          }}
        />
      </Modal>
    </>
  );
};

export default TeachersRestrictionsListModal;
