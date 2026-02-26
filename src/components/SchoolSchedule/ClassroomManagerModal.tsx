import React, { useState, useMemo } from "react";
import { Modal, Button, Input, Table, Space, Tag, Popconfirm, message, Switch, Tooltip } from "antd";
import { BiBuildingHouse } from "react-icons/bi";
import { FaTrash, FaEdit, FaPlus, FaCheck, FaTimes } from "react-icons/fa";
import { Classroom } from "./fucntions";
import { createClassroom, updateClassroom, deleteClassroom } from "../../fetch/schedule/scheduleFetch";
import styles from "./modal.module.css";

interface ClassroomManagerModalProps {
  classrooms: Classroom[];
  onClassroomsUpdated: () => Promise<void> | void;
}

const ClassroomManagerModal: React.FC<ClassroomManagerModalProps> = ({
  classrooms,
  onClassroomsUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sortedClassrooms = useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return [...classrooms].sort((a, b) => collator.compare(a.classroom, b.classroom));
  }, [classrooms]);

  const showModal = () => setIsModalOpen(true);
  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingKey(null);
  };

  const handleCreate = async () => {
    const trimmed = newRoomName.trim();
    if (!trimmed) {
      message.warning("Ingrese un nombre para el aula");
      return;
    }
    setIsLoading(true);
    try {
      const res = await createClassroom(trimmed, true);
      if (res.error) throw new Error(res.message?.message || res.message || "Error al crear");
      message.success("Aula creada");
      setNewRoomName("");
      await onClassroomsUpdated();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await deleteClassroom(id);
      if (res.error) throw new Error(res.message?.message || res.message || "Error al eliminar");
      message.success("Aula eliminada");
      await onClassroomsUpdated();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (record: Classroom) => {
    setIsLoading(true);
    try {
      const res = await updateClassroom(record.id, record.classroom, !record.active);
      if (res.error) throw new Error(res.message?.message || res.message || "Error al actualizar");
      message.success(`Aula ${!record.active ? "abierta" : "cerrada"}`);
      await onClassroomsUpdated();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (record: Classroom) => {
    setEditingKey(record.id);
    setEditName(record.classroom);
  };

  const saveEdit = async (record: Classroom) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      message.warning("El nombre no puede estar vacío");
      return;
    }
    setIsLoading(true);
    try {
      const res = await updateClassroom(record.id, trimmed, record.active ?? true);
      if (res.error) throw new Error(res.message?.message || res.message || "Error al guardar");
      message.success("Aula actualizada");
      setEditingKey(null);
      await onClassroomsUpdated();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      title: "Nombre del Aula",
      dataIndex: "classroom",
      key: "classroom",
      render: (text: string, record: Classroom) => {
        if (editingKey === record.id) {
          return (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onPressEnter={() => saveEdit(record)}
              autoFocus
            />
          );
        }
        return <span style={{ fontWeight: 600 }}>{text}</span>;
      },
    },
    {
      title: "Estado",
      dataIndex: "active",
      key: "active",
      width: 120,
      render: (active: boolean = true, record: Classroom) => (
        <Space direction="vertical" size={0}>
          <Tag color={active ? "green" : "red"} style={{ borderRadius: "10px", padding: "0 10px" }}>
            {active ? "ABIERTA" : "CERRADA"}
          </Tag>
          <Switch
            size="small"
            checked={active}
            onChange={() => handleToggleActive(record)}
            style={{ marginTop: "4px" }}
          />
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 150,
      render: (_: any, record: Classroom) => (
        <Space size="middle">
          {editingKey === record.id ? (
            <>
              <Tooltip title="Guardar">
                <Button
                  type="text"
                  icon={<FaCheck style={{ color: "#52c41a" }} />}
                  onClick={() => saveEdit(record)}
                />
              </Tooltip>
              <Tooltip title="Cancelar">
                <Button
                  type="text"
                  icon={<FaTimes style={{ color: "#ff4d4f" }} />}
                  onClick={() => setEditingKey(null)}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Editar nombre">
                <Button
                  type="text"
                  icon={<FaEdit style={{ color: "#1890ff" }} />}
                  onClick={() => startEdit(record)}
                />
              </Tooltip>
              <Popconfirm
                title="¿Eliminar aula?"
                description="Esta acción no se puede deshacer si el aula está en uso."
                onConfirm={() => handleDelete(record.id)}
                okText="Eliminar"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Eliminar">
                  <Button type="text" icon={<FaTrash style={{ color: "#ff4d4f" }} />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <BiBuildingHouse title="Gestionar Aulas" className={styles.icon} onClick={showModal} />
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BiBuildingHouse style={{ fontSize: "1.4rem", color: "#1890ff" }} />
            <span>Gestión de Aulas</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        width={700}
        footer={null}
        styles={{ body: { paddingTop: "20px" } }}
      >
        <div style={{ marginBottom: "25px", display: "flex", gap: "10px", backgroundColor: "#f5f7fa", padding: "15px", borderRadius: "8px" }}>
          <Input
            placeholder="Nombre de la nueva aula (ej: Aula 101, LAB B)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Button type="primary" icon={<FaPlus />} onClick={handleCreate} loading={isLoading}>
            Agregar Aula
          </Button>
        </div>

        <Table
          dataSource={sortedClassrooms}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          loading={isLoading}
          size="middle"
          locale={{ emptyText: "No hay aulas registradas" }}
        />
      </Modal>
    </>
  );
};

export default ClassroomManagerModal;
