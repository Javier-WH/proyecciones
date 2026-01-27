import TeacherTable from "./teacherTable/TeacherTable";
import SelectedTeacher from "./selectedTeacher/selectedTeacher";
import "./proyeccionesContainer.css";
import { Button, Typography, Space, Segmented, Result } from "antd";
import { TeamOutlined, BookOutlined, UserOutlined, AppstoreOutlined, PlusOutlined } from "@ant-design/icons";
import { GiAutoRepair } from "react-icons/gi";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useNavigate } from "react-router-dom";
import SubjectTab from "./subjectTab/subjectTab";
import ReportMenu from "../report/reoportMenu";

export default function ProyeccionesContainer() {
  const [teacherTab, setTeacherTab] = useState(true);
  const [error, setError] = useState(false);
  const [searchByUserPerfil, setSearchByUserPerfil] = useState<boolean>(true);
  const { setSelectedTeacerId, setSelectedTeacher, subjects, proyectionName } = useContext(
    MainContext
  ) as MainContextValues;

  const navigate = useNavigate();

  const iconStyle = { color: "white", fontSize: "2rem" };

  const handleChangeRadio = (value: string) => {
    //profesores = a, materias = b
    setTeacherTab(value === "a");
    //se deben colocar en null para prevenir posible bugs
    setSelectedTeacerId(null);
    setSelectedTeacher(null);
  };

  useEffect(() => {
    setSelectedTeacher(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //aqui se revisa si existe algun valor null en la tabla subjects
  useEffect(() => {
    if (!subjects) return;
    setError(
      subjects.some((obj) => Object.values(obj).some((value) => value === null)) ||
      subjects.some((subjec) => Number(subjec.hours) <= 0)
    );
  }, [subjects]);



  if (error) {
    return (
      <div
        className="proyecciones-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}>
        <h1>La proyección se ha creado con errores</h1>
        <Button
          style={{ height: "60px", width: "300px", fontSize: "20px" }}
          type="primary"
          icon={<GiAutoRepair style={iconStyle} />}
          onClick={() => navigate("/app/proyecciones/subjects")}>
          Solucionar
        </Button>
      </div>
    );
  }

  // si no hay materias y no hay proyecciones hechas
  if (subjects?.length === 0) {
    return (
      <div
        className="proyecciones-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f0f2f5"
        }}>
        <Result
          status="404"
          title="No se encontró ninguna proyección"
          subTitle="Parece que aún no has creado ninguna proyección académica para este período."
          extra={
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate("/app/proyecciones/create")}
            >
              Crear Nueva Proyección
            </Button>
          }
        />
      </div>
    );
  }

  const onChageSearchByUserPerfil = (value: boolean) => {
    setSearchByUserPerfil(value);
  };

  return (
    <div>
      <div className="title-bar-container">
        <Typography.Title level={4} style={{ margin: 0, minWidth: "200px", maxWidth: "400px" }} ellipsis={{ tooltip: proyectionName }}>
          {proyectionName}
        </Typography.Title>

        <Space size="middle">
          <Segmented
            options={[
              { label: 'Profesores', value: 'a', icon: <TeamOutlined /> },
              { label: 'Materias', value: 'b', icon: <BookOutlined /> },
            ]}
            value={teacherTab ? 'a' : 'b'}
            onChange={(value) => handleChangeRadio(value as string)}
          />

          <Segmented
            options={[
              { label: teacherTab ? 'Mis Profesores' : 'Mis Materias', value: 1, icon: <UserOutlined /> },
              { label: teacherTab ? 'Todos' : 'Todas', value: 0, icon: <AppstoreOutlined /> },
            ]}
            value={searchByUserPerfil ? 1 : 0}
            onChange={(value) => onChageSearchByUserPerfil(value === 1)}
          />

          <ReportMenu />
        </Space>
      </div>

      <div
        style={{
          position: "relative",
          height: "calc(100vh - 80px)",
          overflow: "hidden",
        }}>
        {teacherTab ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(380px, 30%) 1fr",
              gridTemplateRows: "1fr",
              gap: "16px",
              padding: "10px",
              height: "100%",
              overflow: "hidden",
            }}>
            <TeacherTable searchByUserPerfil={searchByUserPerfil} />
            <SelectedTeacher />
          </div>
        ) : (
          <>
            <SubjectTab searchByUserPerfil={searchByUserPerfil} />
          </>
        )}
      </div>
    </div >
  );
}

