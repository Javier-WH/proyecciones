import getInscriptionData from "../../../fetch/getInscriptionData"
import { useEffect, useState } from "react"
import { InscriptionData, InscripionTurno } from "../../../interfaces/inscriptionData"
import { Tag, Slider, message, Card, Button } from 'antd';
import { CloseCircleOutlined, AppstoreAddOutlined, OrderedListOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Spinner from "../../spinner/spinner"

import "./NewProyectionContainer.css"

export default function NewProyectionContainer({ programaId, trayectoId }: { programaId: string | null | undefined, trayectoId: string | null | undefined }) {

  const [inscriptionData, setInscriptionData] = useState<InscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [passed, setPassed] = useState<Record<string, InscripionTurno> | null>(null)
  const [turnos, setTurnos] = useState<Array<{ turnoName: string, seccions: number, total: number } | null> | null>(null)
  const [errorShown, setErrorShown] = useState(false)

  useEffect(() => {
    if (!programaId || !trayectoId) return
    setLoading(true)
    getInscriptionData({ programId: programaId, trayectoId: trayectoId })
      .then(data => setInscriptionData(data))
  }, [programaId, trayectoId])

  useEffect(() => {
    if (!inscriptionData) return
    setLoading(false)
    setPassed(inscriptionData.data.passed)
  }, [inscriptionData])

  useEffect(() => {
    if (!passed) return
    //console.log(passed)
    const _turnos = Object.keys(passed).map((key) => {
      const turnoData = {
        turnoName: passed[key].turnoName,
        total: passed[key].total,
        seccions: 1
      }
      return turnoData
    })
    setTurnos(_turnos)
  }, [passed])



  const onChangeSlider = (value: number, index: number, totalInscriptions: number) => {
    if (totalInscriptions / value < 1) {
      if (!errorShown) { // Verifica si el mensaje ya se mostró
        message.error('No hay suficientes estudiantes para una nueva sección');
        setErrorShown(true); // Marca el mensaje como mostrado
      }
      return;
    } else {
      setErrorShown(false); // Resetea el estado si se puede cambiar el valor
    }

    if (!turnos) return
    const _turnos = [...turnos]
    if (_turnos[index] === null) return
    _turnos[index].seccions = value
    setTurnos(_turnos)
  }

  return <div>
   
    {
      loading
        ? <Spinner />
        : <div style={{ margin: "20px", display: "flex", flexDirection: "column", rowGap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 3fr", gap: "20px" }}>
            <Button type="primary" icon={<AppstoreAddOutlined />} size={'large'}>
              Generar
            </Button>
            <Button type="primary" icon={<OrderedListOutlined />} size={'large'}>
              Pensum
            </Button>
            <Button type="primary" icon={<UnorderedListOutlined />} size={'large'}>
              Estudiantes
            </Button>
          </div>

          {
            !turnos || turnos.length === 0
              ? <Tag icon={<CloseCircleOutlined />} color="error">No se encontrarion inscripciones</Tag>
              : turnos.map((turno, i) =>
                <div key={turno?.turnoName} style={{ display: "flex", gap: "20px", backgroundColor: "#001529", color: "white", padding: "10px", borderRadius: "10px" }}>
                  <div>
                    <h1>{turno?.turnoName}</h1>
                    <p>{turno?.total} Estudiantes Inscritos</p>
                    <div className="new-proyection-slider" style={{ width: "300px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{turno?.seccions} secciones</span>
                      <Slider
                        style={{ width: "200px" }}
                        min={1}
                        max={20}
                        onChange={e => onChangeSlider(e, i, turno?.total || 0)}
                        value={turno?.seccions}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {
                      new Array(turno?.seccions || 0).fill(0).map((_, j) => {
                        const totalEstudiantes = turno?.total || 0;
                        const secciones = turno?.seccions || 1; // Evitar división por cero

                        // Calcular cuántos estudiantes por sección
                        const estudiantesPorSeccion = Math.floor(totalEstudiantes / secciones);
                        const seccionesConMasEstudiantes = totalEstudiantes % secciones; // Resto para distribuir

                        // Determinar el número de estudiantes en esta sección
                        const estudiantesEnEstaSeccion = j < seccionesConMasEstudiantes ? estudiantesPorSeccion + 1 : estudiantesPorSeccion;

                        return (
                          <Card key={j} title={`Sección ${j + 1}`} size="small"  style={{ width: 300 }}>
                            <p>{`Número de Estudiantes: ${estudiantesEnEstaSeccion}`}</p>
                          
                          </Card>

                        );
                      })}
                  </div>
                </div>)
          }

        </div>
    }
  </div>

}