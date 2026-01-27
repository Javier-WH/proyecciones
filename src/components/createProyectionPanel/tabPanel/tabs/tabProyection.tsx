import { useContext, useEffect, useState } from "react";
import { Subject } from "../../../../interfaces/subject";
import { Button, Divider, message, Card, Statistic, Row, Col, Typography, Empty, Space } from "antd";
import { MainContext } from "../../../../context/mainContext";
import { MainContextValues } from "../../../../interfaces/contextInterfaces";
import { v4 as uuidv4 } from "uuid";
import { MinusOutlined, PlusOutlined, RocketOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface SeccionContentItem {
  turnoName?: string;
  sectionCount?: number;
}


export default function TabProyection({ subjectList, turnos }: { subjectList: Subject[], turnos: string[] }) {

  const { handleSubjectChange, subjects } = useContext(MainContext) as MainContextValues;

  const [secciones, setSecciones] = useState<SeccionContentItem[]>([]);

  // llena el array de secciones con los valores de turnos
  useEffect(() => {
    if (!turnos) return;
    const newSecciones = sortTurns(turnos)?.map((turno) => {
      return {
        turnoName: turno,
        sectionCount: 1,
      };
    });
    setSecciones(newSecciones);
  }, [turnos])

  // actualiza el array de secciones cuando cambia el numero de secciones
  const handleSectionCountChange = (turnoName: string, newCount: number) => {
    const seccionesCopy = [...secciones];
    const updatedSecciones = seccionesCopy.map((seccion) => {
      if (seccion.turnoName === turnoName && typeof seccion.sectionCount === "number") {
        return { ...seccion, sectionCount: Math.max(1, seccion.sectionCount + newCount) };
      }
      return seccion;
    });
    setSecciones(updatedSecciones);
  }


  // funcion que se encarga de proyectar las materias
  const handleProyectar = () => {
    if (secciones.length === 0) {
      message.error("No hay turnos para proyectar");
      return;
    }
    let morningSections = 1;
    const proyectedSubjects: Subject[] = [];

    for (const seccion of secciones) {
      const { turnoName, sectionCount } = seccion;
      for (let i = 1; i <= sectionCount!; i++) {
        const subjectListCopy = JSON.parse(JSON.stringify(subjectList));


        for (const subject of subjectListCopy) {
          subject.innerId = uuidv4();
          subject.turnoName = turnoName || "No definido";
          proyectedSubjects.push(subject);
          if (turnoName === "Mañana" || turnoName === "Tarde") {
            subject.seccion = morningSections.toString();
          } else {
            subject.seccion = i.toString();
          }

        }

        if (turnoName === "Mañana" || turnoName === "Tarde") {
          morningSections++;
        }

      }
    }

    handleSubjectChange([...proyectedSubjects, ...(subjects ?? [])]);

  };



  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Configuración de Secciones</Title>
          <Text type="secondary">Defina el número de secciones para cada turno disponible</Text>
        </div>
        <Button
          disabled={secciones.length === 0}
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={handleProyectar}
        >
          Generar Proyección
        </Button>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {secciones.length === 0 ? (
        <Empty description="No hay turnos disponibles para este trayecto o malla" />
      ) : (
        <Row gutter={[16, 16]}>
          {secciones.map((seccion) => (
            <Col xs={24} sm={12} md={8} lg={6} key={seccion.turnoName}>
              <Card
                title={<Text strong>{seccion.turnoName}</Text>}
                bordered={false}
                style={{
                  textAlign: 'center',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Statistic
                  value={seccion.sectionCount}
                  valueStyle={{ color: '#1890ff', fontSize: '48px', fontWeight: 'bold' }}
                />
                <Space style={{ marginTop: '16px' }}>
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<MinusOutlined />}
                    onClick={() => handleSectionCountChange(seccion.turnoName!, -1)}
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={() => handleSectionCountChange(seccion.turnoName!, 1)}
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}


function sortTurns(arr: string[]) {
  const ordenDeseado = ["Mañana", "Tarde", "Noche"];
  arr.sort((a: string, b: string) => {
    const indexA = ordenDeseado.indexOf(a);
    const indexB = ordenDeseado.indexOf(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    else if (indexA !== -1) {
      return -1;
    }
    else if (indexB !== -1) {
      return 1;
    }
    else {
      return 0;
    }
  });

  return arr;
}





