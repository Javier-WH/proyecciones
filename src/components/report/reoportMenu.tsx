import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown, message, Space } from 'antd';
import { RiFileExcel2Line } from "react-icons/ri";
import getReport from '../../fetch/report';


const handleMenuClick: MenuProps['onClick'] = async (e) => {
  const pnfId = sessionStorage.getItem("userPNF")?.replace(/"/g, '');
  console.log(pnfId)
  if (!pnfId) return
  const type = Number.parseInt(e.key)
  const report = await getReport({ pnfId, type})
  if (report.error) return message.error(report.message)

};

const items: MenuProps['items'] = [
  {
    label: 'Proyección trimestral',
    key: '1',
    icon: <RiFileExcel2Line />,
  },
  {
    label: 'Proyección annual',
    key: '2',
    icon: <RiFileExcel2Line />,
  },
];

const menuProps = {
  items,
  onClick: handleMenuClick,
};

const ReportMenu: React.FC = () => {
  return  <Dropdown menu={menuProps}>
      <Button type="link">
        <Space>
          Generar reporte
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
}

export default ReportMenu;