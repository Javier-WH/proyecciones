import React, { useState } from 'react';
import { Outlet, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChalkboardTeacher, FaUserEdit } from "react-icons/fa";
import { LiaSchoolSolid } from "react-icons/lia";
import { GrSchedules, GrConfigure } from "react-icons/gr";
import { IoPersonAddSharp } from "react-icons/io5";
import { FaUsers } from "react-icons/fa6";
import type { MenuProps } from 'antd';
import { Layout, Menu } from 'antd';

const {  Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('Proyecciones', '/app/proyecciones', <FaCalendarAlt />, ),
  getItem('Profesores', '/app/profesores', <FaChalkboardTeacher />, [
    getItem('Registrar', '/app/registrar', <IoPersonAddSharp />),
    getItem('Editar', '/app/editar', <FaUserEdit />),
    getItem('Perfiles', '/app/perfiles', <FaUsers />),
  ]),
  getItem('Pensum', '/app/pensum', <LiaSchoolSolid />, [
    getItem('Tom', '3'),
    getItem('Bill', '4'),
    getItem('Alex', '5'),
  ]),
  getItem('Horarios', '/app/horarios', <GrSchedules />, [
    getItem('Team 1', '6'), 
    getItem('Team 2', '8')
  ]),
  getItem('Configuración', '/app/config', <GrConfigure />),
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();


  const handleClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items}  onClick={handleClick}/>
      </Sider>
      <Layout>
          <Outlet />
      </Layout>
    </Layout>
  );
};

export default MainLayout;