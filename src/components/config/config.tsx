import type { DatePickerProps, TableProps } from "antd";
import { DatePicker, Input, Button, Table, message } from "antd";
import { useEffect, useState, useContext} from "react";
import getProyections from "../../fetch/getProyections";
import getConfig from "../../fetch/getConfig";
import SetActiveProyection from "../../fetch/setActiveProyection";
import postProyection from "../../fetch/postProyection";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";

interface ProyectionDataType {
  id: string;
  year: string;
  name: string;
}

export default function Config() {

  const { handleReload } = useContext(MainContext) as MainContextValues
  const [year, setYear] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [proyectionList, setProyectionList] = useState<ProyectionDataType[]>([]);
  const [activeProyection, setActiveProyection] = useState<string | null>(null);

  const fetchProyections = async () => {
    const proyections = await getProyections();
    setProyectionList(proyections);
    const config = await getConfig();
    const activeProyectionId = config.active_proyection
    const activeProyection = proyections.find((proyection: ProyectionDataType) => proyection.id === activeProyectionId);
    setActiveProyection(activeProyection?.name);
  };

  useEffect(() => {
    fetchProyections();
  }, [])

  const onYearChange: DatePickerProps["onChange"] = (_, dateString) => {
    setYear(String(dateString));
  };

  const handleClickActivate = async (id: string) => {
    await SetActiveProyection({ active_proyection: id });
    await fetchProyections();
    handleReload()
    message.success("Proyeccion activada");
  }

  const handleCreateProyection = async () => {
    if (!year || name.length === 0) {
      message.warning("Por favor, ingrese un año y un nombre para la proyección");
      return;
    }
    const response = await postProyection({ year, name });
    if (response.error) {
      message.error(response.error);
      return;
    }
    fetchProyections();
  }

  const columns: TableProps<ProyectionDataType>['columns'] = [
    {
      title: 'Año',
      dataIndex: 'year',
      key: 'year',
      width: "40%"
    },
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      width: "40%"
    },
    {
      title: 'Activar',
      dataIndex: 'id',
      key: 'id',
      width: "20%",
      render: (_, record) => {
        return <Button type="primary" onClick={() => handleClickActivate(record.id)}>Activar</Button>;
      },
    }
  ];

  return (
    <div>
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
          <label style={{ color: "gray" }}>Año donde inicia la proyección</label>
          <DatePicker onChange={onYearChange} picker="year" placeholder="Selecciona un año" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <label style={{ color: "gray" }}>Nombre de la proyección</label>
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
          <Button
            onClick={handleCreateProyection}
            type="primary"
            disabled={!year || !name}
          >
            Crear
          </Button>
        </div>
      </div>

      <div style={{ padding: "10px" }}>
        <h2 style={{ color: "gray" }}>Proyecciones</h2>
        <h3>{
          activeProyection 
            ? <><span style={{ color: "gray" }}>{"Proyección activa ->"} </span> <span style={{ color: "green" }}>{activeProyection}</span></>
            : <span style={{ color: "red" }}> "No hay una proyección activa"</span>
        }</h3>
        <Table<ProyectionDataType> columns={columns} dataSource={proyectionList} pagination={{ position: ["topLeft", "none"] }} />
      </div>

    </div>
  );
}

