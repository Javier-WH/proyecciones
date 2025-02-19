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
        onClick={() => setMenuVisible(false)}
        style={{
          overflow: "hidden",
          display:"flex",
          position: "absolute",
          width: menuVisible ? "200px" : "0px",
          height: menuVisible ? "130px" : "0px",
          backgroundColor: "#001529",
          border: menuVisible ? "1px solid gray" : "none",
          right:"0px",
          padding: menuVisible ? "10px" : "0px",
          flexDirection: "column",
          alignItems: "start",
          justifyContent: "space-between",
          transition: "all 0.3s ease-in-out"
        }}>
        <ReportProyection />
        <ReportProyectionGeneral />
        <Excel />
      </div>
    </div>
  );
}

