import { useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChalkboardTeacher, FaUserEdit, FaThList } from "react-icons/fa";
import { LiaFileContractSolid } from "react-icons/lia";
import { MdSubject, MdEditRoad, MdEditLocation, MdAdminPanelSettings } from "react-icons/md";
import { IoMdPlanet, IoIosCreate } from "react-icons/io";
import { LiaSchoolSolid } from "react-icons/lia";
import { GrSchedules } from "react-icons/gr";
import { FaPersonMilitaryPointing } from "react-icons/fa6";
import { TiInfoLargeOutline } from "react-icons/ti";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { RiLogoutBoxFill } from "react-icons/ri";
import { IoPersonAddSharp } from "react-icons/io5";
import { PiStepsDuotone } from "react-icons/pi";
import { FaUsers } from "react-icons/fa6";
import type { MenuProps } from "antd";
import { Layout, Menu, Modal } from "antd";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import proyeccionesLogo from "../../assets/proyeccionesLogoMiniB.png";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  disabled?: boolean 
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    disabled, 
  } as MenuItem;
}

const MainLayout: React.FC = () => {
  const { userData } = useContext(MainContext) as MainContextValues;
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  // Manejo del cambio de tamaño de la ventana para colapsar el menú
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1300) {
        setCollapsed(true);
        return;
      }
      setCollapsed(false);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Definición de los elementos del menú
  const items: MenuItem[] = [
    getItem("Proyecciones", "/app/_proyecciones", <FaCalendarAlt />, [
      ...(userData?.su ? [getItem("Proyección Activa", "/app/active", <FaPersonMilitaryPointing />)] : []),
      getItem("Crear", "/app/proyecciones/create", <IoIosCreate />),
      getItem("Materias", "/app/proyecciones/subjects", <MdSubject />),
      getItem("Proyeccion", "/app/proyecciones", <FaCalendarAlt />),
    ]),
    getItem("Profesores", "/app/profesores", <FaChalkboardTeacher />, [
      ...(userData?.su ? [getItem("Registrar", "/app/registerTeacher", <IoPersonAddSharp />)] : []),
      getItem("Editar", "/app/editTeacher", <FaUserEdit />),
      getItem("Perfiles", "/app/teacherProfiles", <FaUsers />),
      ...(userData?.su ? [getItem("Contratos", "/app/contracts", <LiaFileContractSolid />)] : []),
    ]),
    ...(userData?.su
      ? [
          getItem("Pensum", "/app/pensum", <LiaSchoolSolid />, [
            getItem("Editar Materias", "/app/editSubject", <MdEditLocation />),
            getItem("Editar Pensum", "/app/pensum/edit", <FaThList />),
          ]),
          getItem("Trayectos Y PNF", "/app/trayectos", <PiStepsDuotone />, [
            getItem("Editar Trayectos", "/app/editTrayectos", <MdEditRoad />),
            getItem("Editar PNF", "/app/editPNF", <IoMdPlanet />),
          ]),
          getItem("Administrador", "/app/admin", <MdAdminPanelSettings />),
        ]
      : []),
    getItem(
      "Horarios",
      "/app/horarios",
      <GrSchedules />,
      [getItem("Crear Horario", "6"), getItem("Editar Horario", "8")],
      true
    ),
    getItem("Información", "/app/info", <TiInfoLargeOutline />),
    getItem("Logout", "logout", <RiLogoutBoxFill />),
  ];

  const handleClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      Modal.confirm({
        title: "¿Estás seguro de que quieres cerrar sesión?",
        content: "Deberás iniciar sesión nuevamente si deseas continuar",
        okText: "Sí, cerrar sesión",
        icon: <QuestionCircleOutlined />,
        okType: "danger",
        cancelText: "No",
        onOk() {
          sessionStorage.removeItem("userSesion");
          navigate("/");
        },
      });
    } else {
      navigate(key);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", width: "100vw" }}>
      <Sider
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "100px",
        }}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}>
        <div
          className="demo-logo-vertical"
          style={{
            height: "100px",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <img
            src={proyeccionesLogo}
            alt="UPTLL"
            style={{
              width: "90%",
              maxWidth: "100px",
            }}
          />
        </div>
        <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline" items={items} onClick={handleClick} />
      </Sider>
      <Layout>
        <Outlet />
      </Layout>
    </Layout>
  );
};

export default MainLayout;

