import "./proyeccionesSubjects.css"
import { useContext, useEffect, useState } from "react"
import { MainContext } from "../../context/mainContext"
import { MainContextValues } from "../../interfaces/contextInterfaces"
import { Radio, Button, Popconfirm, message, Tooltip } from 'antd';
import type { RadioChangeEvent} from 'antd';
import { QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import TablePensum from "./table/table";
import { Subject } from "../../interfaces/subject";



export default function ProyeccionesSubjects() {
  const { subjects, teachers, handleSubjectChange } = useContext(MainContext) as MainContextValues
  const [errorRadio, setErrorRadio] = useState(true);
  const [asignedSubjects, setAsignedSubjects] = useState<Subject[]>([]);
  
  const onChangeRadioError = (e: RadioChangeEvent) => {
    //console.log('radio checked', e.target.value);
    setErrorRadio(e.target.value);
  };

  //aqui se pasa el arreglo de materias que tienen los profesores asignadas
  useEffect(() => {
    if(!teachers) return;
    const asignedSubjectsQ1 = teachers.q1.map(teacher => teacher.load).flat();
    const asignedSubjectsQ2 = teachers.q2.map(teacher => teacher.load).flat();
    const asignedSubjectsQ3 = teachers.q3.map(teacher => teacher.load).flat();
    const uniqueAssignedSubjects = [
      ...new Map(
        [
          ...asignedSubjectsQ1,
          ...asignedSubjectsQ2,
          ...asignedSubjectsQ3
        ].map(obj => [obj?.pensum_id, obj])
      ).values()
    ];
    setAsignedSubjects(uniqueAssignedSubjects as Subject[]);
  }, [teachers])
 
  const handleRemoveErrorSubject = () => {
    if(!subjects) return;
    const subjectsCopy = JSON.parse(JSON.stringify(subjects));
    const filteredSubjects = subjectsCopy.filter((subject: Subject) =>
      Object.values(subject).every(value => value !== null)
    );
    handleSubjectChange(filteredSubjects);
    message.success("Las materias con error fueron eliminadas de la proyección");
  }

  return (<>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem"}}>
      <h1 >Materias en la Proyección</h1>
    
      <Radio.Group onChange={onChangeRadioError} value={errorRadio} >
        <Radio value={true} style={{ color: "white" }}>Todas</Radio>
        <Radio value={false} style={{ color: "white" }}>Error</Radio>
      </Radio.Group>
      <Popconfirm
        title="¿Deseas borrar las materias con error?"
        description="Esta operación no se puede deshacer"
        onConfirm={handleRemoveErrorSubject}
        onCancel={() => { }}
        okText="Borrar Todas"
        cancelText="Cancelar"
        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
        okButtonProps={{ danger: true }}
      >
        <Tooltip placement="bottom" title={"Borrar TODAS las materias con error"} >
        <Button type='link' danger shape="circle" icon={<DeleteOutlined style={{fontSize: "1.5rem"}} />} />
        </Tooltip>
      </Popconfirm>
    </div>


    <TablePensum subjects={
      errorRadio
        ? subjects?.concat(asignedSubjects)
        : subjects?.concat(asignedSubjects)?.filter((subject) => {
          return Object.values(subject).some(value => value === null);
        })
    } />


  </>
  )
}