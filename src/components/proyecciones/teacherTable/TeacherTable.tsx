import React, { useContext, useEffect, useState } from "react";
import type { TableColumnsType } from "antd";
import { Table, Tag, Input, ConfigProvider } from "antd";
import { MainContext } from "../../../context/mainContext";
import { CloseCircleOutlined } from "@ant-design/icons";
import { Teacher } from "../../../interfaces/teacher";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import useSetSubject, { useSubjectResponseTeacherHours } from "../../../hooks/useSetSubject";
import { normalizeText } from "../../../utils/textFilter";
import { shareProfileSubjects } from "../../../utils/subjectProfile";
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

    const shouldFilterByPerfil = searchByUserPerfil && Boolean(userPerfil?.length);

    if (shouldFilterByPerfil) {
      filteredTeachers = teachers?.filter((teacher) =>
        shareProfileSubjects(teacher.perfil, userPerfil)
      );
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

    //filtra los profesores inactivos (los que no tengan flag se consideran activos)
    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.active ?? true;
    });

    // filtra los profesores sin contrato
    filteredTeachers = filteredTeachers.filter((teacher) => {
      return teacher.contractTypeId !== null;
    });

    setData(filteredTeachers);
  }, [searchText, selectedQuarter, teachers, searchByUserPerfil, userPerfil]);

  // const tagStyle: React.CSSProperties = {
  //   width: "100%",
  //   textAlign: "center",
  // };

  const columns: TableColumnsType<Teacher> = [
    {
      title: "DOCENTE",
      key: "name_lastname",
      width: "55%",
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, color: "#1f1f1f" }}>
            {record.lastName}, {record.name}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#8c8c8c" }}>{record.ci}</span>
        </div>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: "CARGA (Q1 | Q2 | Q3)",
      dataIndex: "partTime",
      width: "45%",
      render: (_value, record) => {
        if (!record.contractTypeId) {
          return (
            <Tag color="error" style={{ width: "100%", textAlign: "center" }}>
              Sin Contrato
            </Tag>
          );
        }

        const teacherHourData: useSubjectResponseTeacherHours = getTeacherHoursData(record);

        if (teacherHourData.error || !teacherHourData.data) {
          return <Tag color="error">Error</Tag>;
        }

        const { q1, q2, q3 } = teacherHourData.data;

        // Helper to determine style
        const getStyle = (q: any) => ({
          color: q?.overloaded ? "red" : q?.usedHours === "0" ? "#d9d9d9" : "#1890ff",
          fontWeight: q?.usedHours === "0" ? 400 : 700,
        });

        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: "#fafafa",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid #f0f0f0",
            }}>
            <span style={getStyle(q1)}>{q1?.usedHours}</span>
            <span style={{ color: "#e6e6e6" }}>|</span>
            <span style={getStyle(q2)}>{q2?.usedHours}</span>
            <span style={{ color: "#e6e6e6" }}>|</span>
            <span style={getStyle(q3)}>{q3?.usedHours}</span>
          </div>
        );
      },
      sorter: (a, b) => a.partTime - b.partTime,
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
        height: "100%",
        padding: "0 5px 0 10px",
      }}>
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          border: "1px solid #f0f0f0",
        }}>
        <Input
          size="large"
          placeholder="Buscar docente por nombre, apellido o cédula..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          prefix={<span style={{ color: "#bfbfbf", marginRight: "8px" }}>🔍</span>}
          style={{
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        />

        <div style={{ flex: 1, overflow: "hidden" }}>
          {data?.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                flexDirection: "column",
                gap: "10px",
                color: "#bfbfbf",
              }}>
              <CloseCircleOutlined style={{ fontSize: "2rem" }} />
              <span>No se encontraron resultados</span>
            </div>
          ) : (
            <ConfigProvider locale={es_ES}>
              <Table
                className="tabla-compacta"
                pagination={{
                  position: ["bottomCenter"],
                  simple: true,
                  defaultPageSize: 13,
                  showSizeChanger: false,
                  size: "small",
                }}
                columns={columns}
                dataSource={data ?? []}
                rowKey="id"
                onRow={onRow}
                size="middle"
                scroll={{ y: "calc(100vh - 280px)" }}
                style={{ cursor: "pointer" }}
                rowClassName={(record) =>
                  context.selectedTeacerId === record.id ? "ant-table-row-selected" : ""
                }
              />
            </ConfigProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherTable;

