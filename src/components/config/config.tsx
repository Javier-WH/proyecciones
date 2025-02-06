import type { DatePickerProps } from "antd";
import { DatePicker, Input, Button } from "antd";
import { useState } from "react";

export default function Config() {
  const [year, setYear] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  const onYearChange: DatePickerProps["onChange"] = (_, dateString) => {
    setYear(String(dateString));
  };

  return (
    <>
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          columnGap: "3rem",
        }}>
        <h1>Configuración</h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          minWidth: "700px",
          justifyContent: "stretch",
          alignContent: "center",
          padding: "10px",
        }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <label>Año donde inicia la proyección</label>
          <DatePicker onChange={onYearChange} picker="year" placeholder="Selecciona un año" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <label>Nombre de la proyección</label>
          <Input
            placeholder="Coloca un nombre a la proyección"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "end",
            flex: 1,
          }}>
          <Button type="primary" disabled={!year || !name}>
            Crear
          </Button>
        </div>
      </div>
    </>
  );
}

