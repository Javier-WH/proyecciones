import React, { useMemo } from "react";
import { Modal, List, Button, Empty, Tag, Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ClassroomOverride } from "../../fetch/schedule/classroomOverrideFetch";
import type { Classroom } from "./fucntions";

const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface GroupedOverride {
  key: string;
  subject_name: string;
  day: number;
  classroom_id: string;
  start_time: string;
  end_time: string;
  overrides: ClassroomOverride[];
}

interface ClassroomOverridesModalProps {
  open: boolean;
  onClose: () => void;
  overrides: ClassroomOverride[];
  classrooms: Classroom[];
  onDelete: (overrides: ClassroomOverride[]) => void;
  onDeleteAll: () => void;
}

const ClassroomOverridesModal: React.FC<ClassroomOverridesModalProps> = ({
  open,
  onClose,
  overrides,
  classrooms,
  onDelete,
  onDeleteAll,
}) => {
  const getClassroomName = (id: string) => {
    return classrooms.find((c) => c.id === id)?.classroom || id;
  };

  const groupedOverrides = useMemo(() => {
    // Helper para convertir HH:mm a minutos desde medianoche
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Ordenamos cronológicamente para que bloques de la misma materia en el mismo día queden juntos si son sucesivos
    const sorted = [...overrides].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.subject_name !== b.subject_name) return a.subject_name.localeCompare(b.subject_name);
      return a.start_time.localeCompare(b.start_time);
    });

    const merged: GroupedOverride[] = [];
    
    for (const ov of sorted) {
      // Creamos una clave única para identificar materias idénticas en el mismo día y en la misma aula
      const matchKey = `${ov.subject_name}|${ov.day}|${ov.classroom_id}|${ov.seccion || ''}|${ov.pnf_id || ''}|${ov.trayecto_id || ''}`;
      
      const lastGroup = merged.length > 0 ? merged[merged.length - 1] : null;
      
      const isSameGroup = lastGroup && lastGroup.key === matchKey;
      const gapMinutes = isSameGroup ? timeToMinutes(ov.start_time) - timeToMinutes(lastGroup!.end_time) : Infinity;

      // Si es el mismo grupo (materia, aula, día, etc.) y la diferencia de tiempo es menor o igual a 30 mins (por recesos)
      if (isSameGroup && gapMinutes >= 0 && gapMinutes <= 30) {
        // Bloques contiguos o con brecha corta: extendemos el tiempo y agregamos el override a la lista
        lastGroup.end_time = ov.end_time;
        lastGroup.overrides.push(ov);
      } else {
        merged.push({
          key: matchKey,
          subject_name: ov.subject_name,
          day: ov.day,
          classroom_id: ov.classroom_id,
          start_time: ov.start_time,
          end_time: ov.end_time,
          overrides: [ov]
        });
      }
    }
    return merged;
  }, [overrides]);

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📌 Cambios de Aula Fijados</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        overrides.length > 0 && (
          <Popconfirm
            key="deleteAll"
            title="Eliminar todos los cambios"
            description="¿Estás seguro de que deseas eliminar todos los cambios de aula fijados? Esta acción no se puede deshacer."
            onConfirm={onDeleteAll}
            okText="Sí, eliminar todos"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger>
              Eliminar Todos
            </Button>
          </Popconfirm>
        ),
        <Button key="close" type="primary" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={520}
    >
      {groupedOverrides.length === 0 ? (
        <Empty description="No hay cambios de aula fijados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          <List
            size="small"
            dataSource={groupedOverrides}
            renderItem={(group) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title={`Eliminar cambio de aula`}
                    description={`¿Eliminar el cambio de aula de "${group.subject_name}" el ${dayNames[group.day]}? Se eliminarán ${group.overrides.length} bloque(s) asignados.`}
                    onConfirm={() => onDelete(group.overrides)}
                    okText="Sí, eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>,
                ]}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {group.subject_name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#666", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <Tag color="blue" style={{ margin: 0 }}>{dayNames[group.day]}</Tag>
                    <span>{group.start_time} - {group.end_time}</span>
                    <span>→</span>
                    <Tag color="green" style={{ margin: 0 }}>{getClassroomName(group.classroom_id)}</Tag>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
};

export default ClassroomOverridesModal;
