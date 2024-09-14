import getInscriptionData from "../../../fetch/getInscriptionData"
import { useEffect, useState, useContext } from "react"
import { InscriptionData, InscripionTurno } from "../../../interfaces/inscriptionData"
import { Tag, Slider, message, Card, Button } from 'antd';
import { CloseCircleOutlined, AppstoreAddOutlined, OrderedListOutlined, UnorderedListOutlined } from '@ant-design/icons';
import getPensum from "../../../fetch/getPensum";
import Spinner from "../../spinner/spinner"
import { subjectType, Subject } from "../../../interfaces/subject";
import ShowArrayModal from "../../SowArrayModal/showArrayModal";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import "./NewProyectionContainer.css"

export default function NewProyectionContainer({ programaId, trayectoId }: { programaId: string | null | undefined, trayectoId: string | null | undefined }) {

  interface Pensum {
    hours:number
    id:string
    quarter:Array<number>
    subject:string
    subject_id:string
    trayecto_saga_id:number
  }

  const { subjects, handleSubjectChange } = useContext(MainContext) as MainContextValues
  const [inscriptionData, setInscriptionData] = useState<InscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [passed, setPassed] = useState<Record<string, InscripionTurno> | null>(null)
  const [turnos, setTurnos] = useState<Array<{ turnoName: string, seccions: number, total: number } | null> | null>(null)
  const [modalArrayList, setModalArrayList] = useState<string[] | null>(null)
  const [pensumSlist, setPensumSlist] = useState<string[] | null>(null)
  const [openModal, setOpenModal] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [errorShown, setErrorShown] = useState(false)
  const [pensum, setPensum] = useState<Pensum[] | null>(null)

  useEffect(() => {
    if (!programaId || !trayectoId) return
    setLoading(true)
    getInscriptionData({ programId: programaId, trayectoId: trayectoId })
      .then(data => setInscriptionData(data))
      .catch(error => console.log(error))
    getPensum({ programaId, trayectoId })
      .then(data => {
        setPensumSlist(data.data.pensums.map((subject: subjectType) => subject.subject))
        setPensum(data.data.pensums)
      })
      .catch(error => console.log(error))
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



  const handlePensum = () => {
    if (!pensumSlist || !inscriptionData) return
    setModalArrayList(pensumSlist ?? [])
    const pnfName = inscriptionData.data.pnfName
    const trayectoName = inscriptionData.data.trayectoName
    setModalTitle(`Pensum de ${pnfName} - ${trayectoName}`)
    setOpenModal(true)
  }

  const handleStudents = () => {
    if (!passed || !inscriptionData || !subjects) return
    const studentList: string[] = []

    Object.keys(passed).forEach((key) => {
      const list = passed[key].inscriptionData.map(student => {
        const name = `${student.last_name} ${student.name}`
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        return `${name} - CI: ${student.ci}`
      })
      studentList.push(...list)
    })

    setModalArrayList(studentList)
    const pnfName = inscriptionData.data.pnfName
    const trayectoName = inscriptionData.data.trayectoName
    setModalTitle(`Estudiantes inscritos en ${pnfName} - ${trayectoName}`)
    setOpenModal(true)

  }

  const handleProyecction = () => {
    if (!turnos || !pensum || !inscriptionData || !trayectoId ) return
    
    const totalSections = turnos.reduce((total, turno) => {
      if (turno) {
        return total + turno.seccions;
      }
      return total; 
    }, 0);
    let list: Subject[] | [] = []

    for (let i = 1; i <= totalSections; i++) {
      const subList = pensum.map(subject =>{

        return {
          id: subject.subject_id,
          subject: subject.subject,
          hours: subject.hours ?? 0,
          pnf: inscriptionData.data.pnfName,
          seccion: `T-0${i}`,
          quarter: JSON.parse(subject.quarter.toString()),
          pensum_id: subject.id,
          trayectoId: trayectoId,
          trayectoName: inscriptionData.data.trayectoName,
          trayecto_saga_id: subject.trayecto_saga_id.toString()
        }
      })

      list = [...list, ...subList]
    }
    
    handleSubjectChange([...subjects ?? [], ...list ?? []]);

  }
  
 


  return <div>
    <ShowArrayModal arrayList={modalArrayList ?? []} isModalOpen={openModal} setIsModalOpen={setOpenModal} title={modalTitle} />
    {
      loading
        ? <Spinner />
        : <div style={{ margin: "20px", display: "flex", flexDirection: "column", rowGap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 3fr", gap: "20px" }}>
            <Button type="primary" icon={<AppstoreAddOutlined />} size={'large'} onClick={handleProyecction}>
              Generar
            </Button>
            <Button type="primary" icon={<OrderedListOutlined />} size={'large'} onClick={handlePensum}>
              Pensum
            </Button>
            <Button type="primary" icon={<UnorderedListOutlined />} size={'large'} onClick={handleStudents}>
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
                          <Card key={j} title={`Sección ${j + 1}`} size="small" style={{ width: 300 }}>
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