import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChalkboardTeacher, FaUserEdit, FaThList } from "react-icons/fa";
import { LiaFileContractSolid } from "react-icons/lia";
import { MdSubject, MdEditRoad, MdEditLocation } from "react-icons/md";
import { IoMdPlanet, IoIosCreate } from "react-icons/io";
import { LiaSchoolSolid } from "react-icons/lia";
import { GrSchedules } from "react-icons/gr";
import { FaPersonMilitaryPointing } from "react-icons/fa6";
import { IoPersonAddSharp } from "react-icons/io5";
import { PiStepsDuotone } from "react-icons/pi";
import { FaUsers } from "react-icons/fa6";
import type { MenuProps } from "antd";
import { Layout, Menu } from "antd";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem("Proyecciones", "/app/_proyecciones", <FaCalendarAlt />, [
    getItem("Proyección Activa", "/app/active", <FaPersonMilitaryPointing />),
    getItem("Crear", "/app/proyecciones/create", <IoIosCreate />),
    getItem("Materias", "/app/proyecciones/subjects", <MdSubject />),
    getItem("Proyeccion", "/app/proyecciones", <FaCalendarAlt />),
  ]),
  getItem("Profesores", "/app/profesores", <FaChalkboardTeacher />, [
    getItem("Registrar", "/app/registerTeacher", <IoPersonAddSharp />),
    getItem("Editar", "/app/editTeacher", <FaUserEdit />),
    getItem("Perfiles", "/app/teacherProfiles", <FaUsers />),
    getItem("Contracts", "/app/contracts", <LiaFileContractSolid />),
  ]),
  getItem("Pensum", "/app/pensum", <LiaSchoolSolid />, [
    getItem("Editar Materias", "/app/editSubject", <MdEditLocation />),
    getItem("Editar Pensum", "/app/pensum/edit", <FaThList />),
  ]),
  getItem("Trayectos Y PNF", "/app/trayectos", <PiStepsDuotone />, [
    getItem("Editar Trayectos", "/app/editTrayectos", <MdEditRoad />),
    getItem("Editar PNF", "/app/editPNF", <IoMdPlanet />),
  ]),
  getItem("Horarios", "/app/horarios", <GrSchedules />, [
    getItem("Crear Horario", "6"),
    getItem("Editar Horario", "8"),
  ]),
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: "100vh", width: "100vw" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16 }} />
        <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline" items={items} onClick={handleClick} />
      </Sider>
      <Layout>
        <Outlet />
      </Layout>
    </Layout>
  );
};

export default MainLayout;

