import React, { useContext, useEffect, useState } from "react";
import type { TableColumnsType } from "antd";
import { Table, Tag, Input, ConfigProvider } from "antd";
import { MainContext } from "../../../context/mainContext";
import { CloseCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Teacher } from "../../../interfaces/teacher";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import useSetSubject, { useSubjectResponseTeacherHours } from "../../../hooks/useSetSubject";
import { normalizeText } from "../../../utils/textFilter";
import es_ES from "antd/es/locale/es_ES";

interface TeacherTableProps {
  searchByUserPerfil: boolean;
}
const TeacherTable: React.FC<TeacherTableProps> = ({ searchByUserPerfil }) => {
  const context = useContext(MainContext) as MainContextValues;
  const { getTeacherHoursData } = useSetSubject(context.subjects || []);
  const { teachers, setSelectedTeacherById, selectedQuarter, userPerfil } = context;
  const [data, setData] = useState<Teacher[] | null>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!teachers) return;

    setData(teachers || null);
  }, [selectedQuarter, teachers]);

  // filtro de busqueda
  useEffect(() => {
    if (!teachers) return;
    let filteredTeachers = [];

    function canTeach(array1: string[], array2: string[]) {
      for (let i = 0; i < array1.length; i++) {
        for (let j = 0; j < array2.length; j++) {
          if (array1[i] === array2[j]) {
            return true;
          }
        }
      }
      return false;
    }

    if (searchByUserPerfil) {
      filteredTeachers = teachers?.filter((teacher) => {
        if (canTeach(teacher.perfil || [], userPerfil || [])) {
          return true;
        }
        return false;
      });
    } else {
      filteredTeachers = teachers;
    }

    if (searchText.length > 0 && filteredTeachers?.length > 0) {
      filteredTeachers = filteredTeachers?.filter((teacher) => {
        return (
          normalizeText(teacher.name).includes(normalizeText(searchText)) ||
          normalizeText(teacher?.lastName).includes(normalizeText(searchText)) ||
          normalizeText(teacher?.ci).includes(normalizeText(searchText)) ||
          normalizeText(teacher.perfilName).includes(normalizeText(searchText)) ||
          normalizeText(teacher.type).includes(normalizeText(searchText))
        );
      });
    }

    //filtra los profesores inactivos
    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.active;
    });

    // filtra los profesores sin contrato
    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.contractTypeId !== null;
    });

    setData(filteredTeachers);
  }, [searchText, selectedQuarter, teachers, searchByUserPerfil, userPerfil]);

  const tagStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "center",
  };

  const columns: TableColumnsType<Teacher> = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      width: "20%",
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    {
      title: "Apellido",
      dataIndex: "lastName",
      key: "lastName",
      width: "25%",
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    {
      title: "Cédula",
      dataIndex: "ci",
      key: "ci",
      width: "14%",
      sorter: (a, b) => Number.parseInt(a.ci) - Number.parseInt(b.ci),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    /*{
      title: "Tipo de contrato",
      dataIndex: "type",
      key: "type",
      width: "16%",
      sorter: (a, b) => a.type.localeCompare(b.type),
      sortDirections: ["descend", "ascend"],
      render: (value) => {
        if (!value) {
          return (
            <Tag color="red" style={tagStyle} icon={<ExclamationCircleOutlined />}>
              Sin contrato
            </Tag>
          );
        }
        return (
          <Tag color="blue" style={tagStyle}>
            {value}
          </Tag>
        );
      },
    },*/
    {
      title: "Horas",
      dataIndex: "partTime",
      width: "11%",
      render: (_value, record) => {
        if (!record.contractTypeId) {
          return (
            <Tag color="red" style={tagStyle} icon={<ExclamationCircleOutlined />}>
              Sin contrato
            </Tag>
          );
        }

        const teacherHourData: useSubjectResponseTeacherHours = getTeacherHoursData(record);

        if (teacherHourData.error) {
          return <Tag color="error">Error</Tag>;
        }

        if (!teacherHourData.data) {
          return <Tag color="error">Error</Tag>;
        }

        const { q1, q2, q3 } = teacherHourData.data;

        const colorQ1 = q1?.overloaded ? "red" : q1?.usedHours === "0" ? "gray" : "black";
        const colorQ2 = q2?.overloaded ? "red" : q2?.usedHours === "0" ? "gray" : "black";
        const colorQ3 = q3?.overloaded ? "red" : q3?.usedHours === "0" ? "gray" : "black";

        return (
          <div
            style={{
              textAlign: "center",
              color: "darkgray",
            }}>
            <span style={{ color: colorQ1 }}>{q1?.usedHours}</span>/
            <span style={{ color: colorQ2 }}>{q2?.usedHours}</span>/
            <span style={{ color: colorQ3 }}>{q3?.usedHours}</span>
          </div>
        );
      },
      key: "partTime",
      sorter: (a, b) => a.partTime - b.partTime,
      sortDirections: ["descend", "ascend"],
    },
  ];

  const onRow = (record: Teacher) => {
    return {
      onClick: () => {
        setSelectedTeacherById(record.id);
      },
    };
  };

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 70px)",
        cursor: "pointer",
        marginTop: "5px",
        marginLeft: "5px",
        overflow: "hidden",
        position: "relative"
      }}>
      <Input
        style={{ width: "100%" }}
        placeholder="Buscar profesor"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />
      {data?.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Tag icon={<CloseCircleOutlined />} color="error">
            Sin profesores encontrados
          </Tag>
        </div>
      ) : (
        <ConfigProvider locale={es_ES}>
          <Table
            className="tabla-compacta"
            pagination={{
              position: ["topLeft", "none"],
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            columns={columns}
            dataSource={data ?? []}
            rowKey="id"
            onRow={onRow}
            style={{ cursor: "pointer" }}
            scroll={{ y: "calc(100vh - 200px)" }}
          />
        </ConfigProvider>
      )}
    </div>
  );
};

export default TeacherTable;

