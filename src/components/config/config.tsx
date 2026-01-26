import type { DatePickerProps, TableProps } from "antd";
import { DatePicker, Input, Button, Table, message, Tag, Popconfirm, Card } from "antd";
import { useEffect, useState, useContext } from "react";
import getProyections from "../../fetch/getProyections";
import getConfig from "../../fetch/getConfig";
import SetActiveProyection from "../../fetch/setActiveProyection";
import postProyection from "../../fetch/postProyection";
import deleteProyection from "../../fetch/deleteProyection";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Forbidden } from "../../utils/messageComponents";
import { CheckCircleOutlined, DeleteOutlined, ThunderboltOutlined, CalendarOutlined } from "@ant-design/icons";

interface ProyectionDataType {
  id: string;
  year: string;
  name: string;
}

export default function Config() {
  const { handleReload, userData } = useContext(MainContext) as MainContextValues;
  const [year, setYear] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [proyectionList, setProyectionList] = useState<ProyectionDataType[]>([]);
  const [activeProyection, setActiveProyection] = useState<string | null>(null);
  const [activeProyectionId, setActiveProyectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProyections = async () => {
    const proyections = await getProyections();
    // Sort projections by year descending (newest first)
    proyections.sort((a: ProyectionDataType, b: ProyectionDataType) => Number(b.year) - Number(a.year));
    setProyectionList(proyections);

    const config = await getConfig();
    const activeId = config.active_proyection;
    setActiveProyectionId(activeId);

    const activeProj = proyections.find(
      (proyection: ProyectionDataType) => proyection.id === activeId
    );
    setActiveProyection(activeProj?.name || null);
  };

  useEffect(() => {
    fetchProyections();
  }, []);

  const onYearChange: DatePickerProps["onChange"] = (_, dateString) => {
    setYear(String(dateString));
  };

  const handleClickActivate = async (id: string) => {
    await SetActiveProyection({ active_proyection: id });
    await fetchProyections();
    handleReload();
    message.success("Proyección activada correctamente");
  };

  const handleClickDelete = async (id: string) => {
    if (id === activeProyectionId) {
      message.error("No se puede eliminar la proyección activa. Active otra primero.");
      return;
    }

    const response = await deleteProyection(id);
    if (response.error) {
      message.error(response.error);
    } else {
      message.success("Proyección eliminada");
      fetchProyections();
    }
  };

  const handleCreateProyection = async () => {
    if (!year || name.length === 0) {
      message.warning("Por favor, ingrese un año y un nombre para la proyección");
      return;
    }
    setLoading(true);
    const response = await postProyection({ year, name });
    setLoading(false);

    if (response.error) {
      message.error(response.error);
      return;
    }
    message.success("Proyección creada");
    setName("");
    setYear(null);
    fetchProyections();
  };

  const columns: TableProps<ProyectionDataType>["columns"] = [
    {
      title: "Año",
      dataIndex: "year",
      key: "year",
      width: "20%",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
      sorter: (a, b) => Number(a.year) - Number(b.year),
    },
    {
      title: "Nombre de la Proyección",
      dataIndex: "name",
      key: "name",
      width: "50%",
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {text}
          {record.id === activeProyectionId && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              ACTIVA
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: "30%",
      render: (_, record) => {
        const isActive = record.id === activeProyectionId;
        return (
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              type={isActive ? "default" : "primary"}
              disabled={isActive}
              icon={<ThunderboltOutlined />}
              onClick={() => handleClickActivate(record.id)}>
              {isActive ? "Activa" : "Activar"}
            </Button>

            <Popconfirm
              title="¿Eliminar proyección?"
              description="Esta acción eliminará la proyección y no se puede deshacer."
              onConfirm={() => handleClickDelete(record.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okType="danger"
              disabled={isActive}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={isActive}
                title={isActive ? "No se puede eliminar la proyección activa" : "Eliminar"}
              />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  if (!userData?.su) {
    return <Forbidden />;
  }

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflowY: "auto" }}>
      <div
        className="title-bar-container"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "20px",
        }}>
        <h1 style={{ margin: 0 }}>Gestión de Proyecciones</h1>
      </div>

      {/* Create Section */}
      <Card title="Nueva Proyección" style={{ marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: "150px" }}>
            <label style={{ color: "gray", marginBottom: "5px", fontSize: "12px" }}>Año de Inicio</label>
            <DatePicker
              onChange={onYearChange}
              picker="year"
              placeholder="Seleccionar año"
              style={{ width: "100%" }}
              value={year ? undefined : null}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: "250px" }}>
            <label style={{ color: "gray", marginBottom: "5px", fontSize: "12px" }}>Nombre</label>
            <Input
              placeholder="Ej: Proyección 2026 - I"
              value={name}
              onChange={(e) => setName(e.target.value)}
              prefix={<CalendarOutlined style={{ color: "#bfbfbf" }} />}
            />
          </div>

          <div>
            <Button
              onClick={handleCreateProyection}
              type="primary"
              disabled={!year || !name}
              loading={loading}
              style={{ minWidth: "100px" }}
            >
              Crear
            </Button>
          </div>
        </div>
      </Card>

      {/* List Section */}
      <Card
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Listado de Proyecciones</span>
            {activeProyection && (
              <Tag color="#f6ffed" style={{ color: "#52c41a", border: "1px solid #b7eb8f", padding: "4px 10px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", background: "#52c41a", borderRadius: "50%", display: "inline-block" }}></span>
                <b>Activa:</b> {activeProyection}
              </Tag>
            )}
          </div>
        }
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<ProyectionDataType>
          columns={columns}
          dataSource={proyectionList}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
}

