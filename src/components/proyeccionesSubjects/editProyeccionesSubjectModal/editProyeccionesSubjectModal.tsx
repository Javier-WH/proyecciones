import { Button, Modal, Select, Tag, InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Subject } from '../../../interfaces/subject';
import { Teacher } from '../../../interfaces/teacher';
import { useEffect, useContext, useState } from 'react';
import { MainContext } from '../../../context/mainContext';
import { MainContextValues } from '../../../interfaces/contextInterfaces';

const EditProyeccionesSubjectModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  subject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void

}> = ({ open, setOpen, subject, setSelectedSubject }) => {


  const { pnfList, handleSubjectChange, handleTeacherChange, subjects, subjectList, teachers } = useContext(MainContext) as MainContextValues
  const [pnfs, setPnfs] = useState<Array<{ value: string, label: string }> | null>(null)
  const [pnfValue, setPnfValue] = useState<string | null>(null)
  const [_subjects, _setSubjects] = useState<Array<{ value: string, label: string }> | null>(null)
  const [subjectValue, setSubjectValue] = useState<string | null>(null)
  const [trimestreValue, setTrimestreValue] = useState<number[]>([])
  const [hourValue, setHourValue] = useState<number | null>(null)
  const [seccionValue, setSeccionValue] = useState<string>('4')

  useEffect(() => {
    if (subject === null) {
      setOpen(false);
    }
    setPnfValue(subject?.pnf || null)
    setSubjectValue(subject?.subject || null)
    setHourValue(subject?.hours || null)
    setTrimestreValue(subject?.quarter || [])
    setSeccionValue(subject?.seccion || '1')
  }, [subject, setOpen]);

  useEffect(() => {
    if (!pnfList) return;
    setPnfs(pnfList.map((pnf) => {
      return {
        value: pnf.id,
        label: pnf.name
      }
    }))

    if (!subjectList) return
    _setSubjects(subjectList.map((subject) => {
      return {
        value: subject.id,
        label: subject.name
      }
    }))

  }, [pnfList, setPnfs, subjectList, _setSubjects]);

  function getTeacherIndexesByPensumId(quarter: "q1" | "q2" | "q3" | null, pensumId: string) {
    if (!teachers || !quarter) return [];
    const indexes = [];
    const quarterTeacherList = teachers[quarter];

    for (let i = 0; i < quarterTeacherList.length; i++) {
      const teacher: Teacher = quarterTeacherList[i];
      const load = teacher?.load || [];

      for (let j = 0; j < load.length; j++) {
        const loadItem = load[j];
        if (loadItem.pensum_id === pensumId) {
          indexes.push(i);
          break; // Salir del bucle interno una vez que se encuentra el índice
        }
      }
    }

    return indexes;
  }

  const handleOk = () => {
    if (subject === null || hourValue === null || pnfValue === null || subjectValue === null || trimestreValue.length === 0) return

    //edita el array de materias
    const _subjects = JSON.parse(JSON.stringify(subjects));
    const updatedSubjects = _subjects.map((sub: Subject) => {
      if (sub.pensum_id === subject.pensum_id) {
        sub.hours = hourValue
        sub.pnf = pnfValue
        sub.subject = subjectValue
        sub.quarter = trimestreValue
        sub.seccion = seccionValue
      }
      return sub
    })
    handleSubjectChange(updatedSubjects)

    //edita el array de profesores/////////////////
    const _teachers = JSON.parse(JSON.stringify(teachers));
    //se selecciona al menos un trimestre
    const subjecQuater = "q" + subject.quarter[0] as "q1" | "q2" | "q3"
    //se obtiene el pensum_id de la materia
    const pensumID = subject.pensum_id
    //se obtienen los indices de los profesore que tiuen la materia
    const teacherIndexes = getTeacherIndexesByPensumId(subjecQuater, pensumID)

    for (let i = 1; i <= 3; i++) {
      //se verifica que el indice del profesor sea valido
      if (teacherIndexes[0] === undefined || teacherIndexes[0] === null) continue

      if (!trimestreValue.includes(i)) {
        //si el valor de trimestre seleccionado en el frontend no incluye el trimestre actual se elimina la materia
        const newLoad = _teachers[`q${i}`][teacherIndexes[0]]?.load.filter((sub: Subject) => sub.pensum_id !== subject.pensum_id)
        _teachers[`q${i}`][teacherIndexes[0]].load = newLoad
      } else {
        //se verifica si la materia ya se encuentra cargada
        const exist = _teachers[`q${i}`][teacherIndexes[0]]?.load.some((sub: Subject) => sub.pensum_id === subject.pensum_id)
        //si la materia no se encuentra cargada se agrega
        if (!exist) _teachers[`q${i}`][teacherIndexes[0]].load.push(subject)
      }
    }

    //se actualiza los valores del array de profesores
    Object.keys(_teachers).forEach((quarter) => {
      _teachers[quarter]?.forEach((teacher: Teacher) => {
        teacher.load?.forEach((sub: Subject) => {
          if (sub.pensum_id === subject.pensum_id) {
            sub.hours = hourValue
            sub.pnf = pnfValue
            sub.subject = subjectValue
            sub.quarter = trimestreValue
            sub.seccion = seccionValue
          }
        })
      })
    })

    handleTeacherChange(_teachers)
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedSubject(null);
    setOpen(false);
  };

  const handlePnfChange = (value: string) => {
    const pnfName = pnfList?.filter((pnf) => pnf.id === value)[0].name
    setPnfValue(pnfName ?? null)
  }
  const _handleSubjectChange = (value: string) => {
    const subjectName = subjectList?.filter((subject) => subject.id === value)[0].name
    setSubjectValue(subjectName ?? null)
  }

  const handleSeccionChange = (value: string) => {
    setSeccionValue(value)
  }

  const handleTrimestreChange = (trimestre: number) => {
    const trimestres = [...trimestreValue]

    if (trimestres.includes(trimestre)) {
      const index = trimestres.indexOf(trimestre)
      trimestres.splice(index, 1)
      trimestres.sort((a, b) => a - b)
      setTrimestreValue(trimestres)
      return
    }

    trimestres.push(trimestre)
    trimestres.sort((a, b) => a - b)
    setTrimestreValue(trimestres)
  }

  const handleHoursChange: InputNumberProps['onChange'] = (value) => {
    if (typeof value !== "number") return
    setHourValue(value)
  };

  return (
    <>
      <Modal
        open={open}
        title={'Editar materia'}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type='dashed'>
            Cancelar
          </Button>,
          <Button key="submit" type="primary" onClick={handleOk} disabled={false}>
            Aceptar
          </Button>
        ]}
      >
        <div className='change-proyecciones-subject-modal-container' style={{ width: "100%", display: "flex", flexDirection: "column", rowGap: "1rem", marginBottom: "2rem" }}>
          {
            <span style={{ color: 'gray', fontSize: "0.7rem" }}>{subject?.pensum_id}</span> 
          }
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "1rem" }}>
            <div>
              <label style={{
                color: !pnfValue ? "red" : "black",
              }}>Programa</label>
              <Select
                value={pnfValue}
                style={{ width: "100%" }}
                status={pnfValue ? "" : "error"}
                onChange={handlePnfChange}
                options={!pnfs ? [] : pnfs}
              />
              {!pnfValue && <Tag icon={<CloseCircleOutlined />} color="error" >{`No hay PNF seleccionado`}</Tag>}
            </div>

            <div>
              <label style={{
                color: !seccionValue ? "red" : "black",
              }}>Seccion</label>
              <Select
                value={seccionValue}
                style={{ width: "100%" }}
                status={seccionValue ? "" : "error"}
                onChange={handleSeccionChange}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5' }
                ]}
              />
              {!seccionValue && <Tag icon={<CloseCircleOutlined />} color="error" >{`No hay seccion seleccionada`}</Tag>}
            </div>
          </div>



          <div>
            <label style={{
              color: !subjectValue ? "red" : "black",
            }}>Materia</label>
            <Select
              value={subjectValue}
              style={{ width: "100%" }}
              status={subjectValue ? "" : "error"}
              onChange={_handleSubjectChange}
              options={!_subjects ? [] : _subjects}
            />
            {!subjectValue && <Tag icon={<CloseCircleOutlined />} color="error" >{`No hay materia seleccionada`}</Tag>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "1rem" }}>

            <div>
              <label style={{
                color: !hourValue ? "red" : "black",
              }}>Horas</label>

              <InputNumber
                style={{ width: "100%" }}
                status={hourValue ? "" : "error"}
                min={1}
                max={24}
                onChange={handleHoursChange}
                value={hourValue}
              />

              {!hourValue && <Tag icon={<CloseCircleOutlined />} color="error" >{`No hay horas  seleccionadas`}</Tag>}
            </div>

            <div>
              <label style={{
                color: trimestreValue.length === 0 ? "red" : "black",
              }}>Trimestre</label>
              <div style={{ display: "flex", gap: "5px" }}>
                <Button danger={trimestreValue.length === 0} type={trimestreValue.includes(1) ? "primary" : "default"} shape="circle" onClick={() => handleTrimestreChange(1)}>
                  1
                </Button>
                <Button danger={trimestreValue.length === 0} type={trimestreValue.includes(2) ? "primary" : "default"} shape="circle" onClick={() => handleTrimestreChange(2)}>
                  2
                </Button>
                <Button danger={trimestreValue.length === 0} type={trimestreValue.includes(3) ? "primary" : "default"} shape="circle" onClick={() => handleTrimestreChange(3)}>
                  3
                </Button>
              </div>
              {trimestreValue.length === 0 && <Tag icon={<CloseCircleOutlined />} color="error" >{`No hay trimestre seleccionado`}</Tag>}
            </div>

          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditProyeccionesSubjectModal;