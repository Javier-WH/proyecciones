import React from "react";
import { Modal, List, Button, Empty, Tag, Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ClassroomOverride } from "../../fetch/schedule/classroomOverrideFetch";
import type { Classroom } from "./fucntions";

const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface ClassroomOverridesModalProps {
  open: boolean;
  onClose: () => void;
  overrides: ClassroomOverride[];
  classrooms: Classroom[];
  onDelete: (override: ClassroomOverride) => void;
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
      {overrides.length === 0 ? (
        <Empty description="No hay cambios de aula fijados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          <List
            size="small"
            dataSource={overrides}
            renderItem={(override) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Eliminar cambio de aula"
                    description={`¿Eliminar el cambio de aula de "${override.subject_name}" el ${dayNames[override.day]}?`}
                    onConfirm={() => onDelete(override)}
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
                    {override.subject_name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#666", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <Tag color="blue" style={{ margin: 0 }}>{dayNames[override.day]}</Tag>
                    <span>{override.start_time} - {override.end_time}</span>
                    <span>→</span>
                    <Tag color="green" style={{ margin: 0 }}>{getClassroomName(override.classroom_id)}</Tag>
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
