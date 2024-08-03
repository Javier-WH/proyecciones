import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, Radio, Tag, Switch } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { Teacher } from '../../interfaces/teacher';
import { Subject } from '../../interfaces/subject';
import { CloseCircleOutlined } from '@ant-design/icons';
const AddSubjectToTeacherModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  teachers: Array<Teacher> | null
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  selectedTeacerId: number | null
  subjects: Array<Subject> | null
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
}> = ({ open, setOpen, teachers, selectedTeacerId, subjects, setSubjects, setTeachers }) => {

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [perfilOption, setPerfilOption] = useState('perfil');
  const [erroMessage, setErrorMessage] = useState<string | null>(null);
  const [overLoad, setOverLoad] = useState(false);



  useEffect(() => {
    if (!subjects || !teachers || selectedTeacerId === null) return
    //obtengo la lista de asignaturas
    let subjectsData = subjects.map((subject) => ({ value: subject.id, label: `${subject.subject} (PNF ${subject.pnf} - Sección T0-${subject.seccion})` }));
    const teacherPerfil = new Set(teachers[selectedTeacerId]?.perfil ?? []);
    if (perfilOption === 'perfil') {
      subjectsData = subjectsData.filter(subject => teacherPerfil.has(subject.value))
    }
    //las horas que tiene usadas el profesor
    const tehacherLoad = teachers[selectedTeacerId]?.load?.map(subject => subject.hours).reduce((acc, curr) => acc + curr, 0);
    //maximo de horas que puede tener el profesor
    const maxHours = teachers[selectedTeacerId]?.partTime;

    ///// FILTRADO DE HORAS DISPONIBLES
    if(!overLoad){
      subjectsData = subjectsData.filter((subject) => {
        const index = Number.parseInt(subject.value);
        const subjectHourNumber = subjects[index]?.hours;
        const teacherLoadNumber = Number.parseInt(tehacherLoad?.toString() ?? '0');
        const maxHoursNumber = Number.parseInt(maxHours.toString());

        // Validar si los valores son NaN
        if (isNaN(teacherLoadNumber) || isNaN(subjectHourNumber) || isNaN(maxHoursNumber)) {
          return false;
        }
        return teacherLoadNumber + subjectHourNumber <= maxHoursNumber;
      });
    }

    setOptions(subjectsData);

  }, [subjects, perfilOption, teachers, selectedTeacerId, overLoad]);

  //aqui vigilo si existen asignaturas
  useEffect(() => {
    if (!options) return
    if (options.length === 0) {
      setErrorMessage('No hay asignaturas disponibles para este perfil de profesor')
    } else {
      setErrorMessage(null)
    }
  }, [options]);

  const handleOk = () => {
    setLoading(true);
    //valido para no tener errores mas adelante
    if (!teachers || selectedTeacerId === null || subjects === null || selectedOption === null) return
    //obtengo el index de la asignatura
    const index = subjects.findIndex((subject) => subject.id === selectedOption);
    //agrego la asignatura al load del profesor
    const teachersCopy = JSON.parse(JSON.stringify(teachers));
    teachersCopy[selectedTeacerId]?.load?.push(subjects[index]);
    setTeachers(teachersCopy);
    //elimino la asignatura de la lista de asignaturas
    setSubjects(subjects.filter((subject) => subject.id !== selectedOption));
    //limpio el select
    setSelectedOption(null);
    //cierro el modal
    setLoading(false);
    setOverLoad(false);
    setPerfilOption('perfil');
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };


  const handleChange = (value: string) => {
    setSelectedOption(value);
  };

  const optionsWithDisabled = [
    { label: 'Perfil', value: 'perfil' },
    { label: 'Todas', value: 'todas' },
  ];

  const onChangeRadio = ({ target: { value } }: RadioChangeEvent) => {
    setPerfilOption(value);
    setSelectedOption(null);
  };

  return (
    <>
      <Modal
        open={open}
        title={`Materias disponibles para el docente ${teachers?.[selectedTeacerId ?? 0]?.name ?? ''} ${teachers?.[selectedTeacerId ?? 0]?.lastName ?? ''}`}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel} type='dashed'>
            Cancelar
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleOk} disabled={selectedOption === null}>
            Agregar
          </Button>
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "end", marginBottom: "5px", marginTop: "30px" }}>

          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
            <Switch  onChange={() => setOverLoad(!overLoad)} value={overLoad}/>
              <span style={{ marginLeft: "10px" }}>Sobrecarga de horas</span>
            </div>
            <Radio.Group
              options={optionsWithDisabled}
              onChange={onChangeRadio}
              value={perfilOption}
              optionType="button"
              buttonStyle="solid"
            />
          </div>

          <br />

          <Select
            placeholder="Selecciona una materia"
            size="large"
            onChange={handleChange}
            style={{ width: "100%" }}
            options={options}
            value={selectedOption}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            disabled={options.length === 0 || selectedTeacerId === null}
          />
          <div style={{ width: "100%", paddingLeft: "20px", visibility: erroMessage ? "visible" : "hidden" }}>
            <Tag icon={<CloseCircleOutlined />} color="error">
              {erroMessage}
            </Tag>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddSubjectToTeacherModal;