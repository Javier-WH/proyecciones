import { DownOutlined, CloudDownloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown, message, Space } from "antd";
import getReport from "../../fetch/report";
import React, { useContext } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

const ReportMenu: React.FC = () => {
  const { userPNF } = useContext(MainContext) as MainContextValues;

  const handleMenuClick: MenuProps["onClick"] = async (e) => {
    // Use userPNF from context, stripping quotes if necessary (though context should handle clean data, legacy replacement kept for safety)
    const pnfId = userPNF?.replace(/"/g, "") || "";

    if (!pnfId) {
      message.warning("No se ha identificado el PNF del usuario");
      return;
    }

    const type = Number.parseInt(e.key);
    try {
      message.loading({ content: "Generando reporte...", key: 'reportGen' });
      const report = await getReport({ pnfId, type });
      if (!report.success) {
        message.error({ content: report.message, key: 'reportGen' });
      } else {
        message.success({ content: "Reporte generado correctamente", key: 'reportGen' });
      }
    } catch (error) {
      message.error({ content: "Error al generar el reporte", key: 'reportGen' });
    }
  };

  const items: MenuProps["items"] = [
    {
      label: "Proyección Trimestral",
      key: "1",
      icon: <FileExcelOutlined />,
    },
    {
      label: "Proyección Anual",
      key: "2",
      icon: <FileExcelOutlined />,
    },
  ];

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  return (
    <Dropdown menu={menuProps} trigger={['click']}>
      <Button type="primary" icon={<CloudDownloadOutlined />}>
        <Space>
          Reportes
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
};

export default ReportMenu;

