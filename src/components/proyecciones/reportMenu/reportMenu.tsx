import { useState } from "react";
import { Button } from "antd";
import { FaWpforms } from "react-icons/fa";
import ReportProyection from "../../reports/report/reportProyection";
import ReportProyectionGeneral from "../../reports/report/reportProyecionGeneral";
import Excel from "../../reports/excel";

export default function ReportMenu() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <Button onClick={() => setMenuVisible(!menuVisible)} type="link" icon={<FaWpforms />}></Button>
      <div
        style={{
          display: menuVisible ? "flex" : "none",
          position: "absolute",
          width: "200px",
          height: "130px",
          backgroundColor: "#001529",
          border: "1px solid gray",
          right: "0px",
          padding: "10px",
          flexDirection: "column",
          alignItems: "start",
          justifyContent: "space-between",
        }}>
        <ReportProyection />
        <ReportProyectionGeneral />
        <Excel />
      </div>
    </div>
  );
}

