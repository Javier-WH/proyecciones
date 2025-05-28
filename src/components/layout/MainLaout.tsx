import { useContext, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChalkboardTeacher, FaUserEdit, FaThList } from "react-icons/fa";
import { LiaFileContractSolid } from "react-icons/lia";
import { MdSubject, MdEditRoad, MdEditLocation } from "react-icons/md";
import { IoMdPlanet, IoIosCreate } from "react-icons/io";
import { LiaSchoolSolid } from "react-icons/lia";
import { GrSchedules } from "react-icons/gr";
import { FaPersonMilitaryPointing } from "react-icons/fa6";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { RiLogoutBoxFill } from "react-icons/ri";
import { IoPersonAddSharp } from "react-icons/io5";
import { PiStepsDuotone } from "react-icons/pi";
import { FaUsers } from "react-icons/fa6";
import type { MenuProps } from "antd";
import { Layout, Menu, Modal } from "antd";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import UPTLL_logo from "../../assets/UPTLL_Logo_A.png";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  disabled?: boolean // Nuevo parámetro opcional
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    disabled, // Añade la propiedad disabled
  } as MenuItem;
}

const MainLayout: React.FC = () => {
  const { userData } = useContext(MainContext) as MainContextValues;
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

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
        ]
      : []),
    getItem("Horarios", "/app/horarios", <GrSchedules />, [
      getItem("Crear Horario", "6"),
      getItem("Editar Horario", "8"),
    ]),

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
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ height: "100px", color: "white", position: "relative" }}>
          <img
            src={UPTLL_logo}
            alt="UPTLL"
            style={{
              width: "100%",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0px 0px 2px rgba(255, 255, 255, 1))",
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

