import { Button, Input, Table, Card, Tag, Typography } from "antd";
import { EditOutlined, SearchOutlined, UserOutlined, PlusOutlined } from "@ant-design/icons";
import { Teacher } from "../../../interfaces/teacher";
import { useEffect, useState } from "react";
import EditTeacherModal from "./EditTeacherModal";
import getTeachers from "../../../fetch/getTeachers";
import Spinner from "../../spinner/spinner";
// import "./editTeachers.css"; // CSS no longer needed with Ant Design components

const { Title } = Typography;

export default function EditTeachers() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onClickEdit = (data: Teacher) => {
    setTeacherData(data);
    setIsModalOpen(true);
  };

  async function fetchTeachers() {
    const teachers = await getTeachers();
    setTeachers(teachers);
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  const getFilteredTeachers = () => {
    if (!teachers) return [];
    if (search.length > 0) {
      const lowerSearch = search.toLowerCase();
      return teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(lowerSearch) ||
          teacher?.lastName?.toLowerCase().includes(lowerSearch) ||
          teacher?.ci?.toLowerCase().includes(lowerSearch) ||
          teacher.perfilName?.toLowerCase()?.includes(lowerSearch)
      );
    }
    return teachers;
  };

  const columns = [
    {
      title: 'Apellidos',
      dataIndex: 'lastName',
      key: 'lastName',
      sorter: (a: Teacher, b: Teacher) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Nombres',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Teacher, b: Teacher) => a.name.localeCompare(b.name),
    },
    {
      title: 'Cédula',
      dataIndex: 'ci',
      key: 'ci',
    },
    {
      title: 'Perfil',
      dataIndex: 'perfilName',
      key: 'perfilName',
      render: (perfilName: string) => (
        <>
          {perfilName?.split(',').map((tag, index) => {
            if (!tag.trim()) return null;
            return (
              <Tag color="blue" key={index}>
                {tag.toUpperCase()}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Teacher) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onClickEdit(record)}
        >
          Editar
        </Button>
      ),
    },
  ];

  if (teachers === null) return <Spinner />;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <EditTeacherModal
        teacherData={teacherData}
        setTeacherData={setTeacherData}
        fetchTeachers={fetchTeachers}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={2} style={{ margin: 0 }}>Gestión de Profesores</Title>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => {
              setTeacherData(null);
              setIsModalOpen(true);
            }}
          >
            Agregar Profesor
          </Button>
        </div>

        <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input.Search
              placeholder="Buscar por nombre, apellido, cédula o perfil..."
              allowClear
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 400 }}
              size="large"
              enterButton={<Button icon={<SearchOutlined />} type="primary" />}
            />
            <span style={{ color: '#8c8c8c' }}>Total: {getFilteredTeachers().length} profesores</span>
          </div>

          <Table
            columns={columns}
            dataSource={getFilteredTeachers()}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </div>
    </div>
  );
}

