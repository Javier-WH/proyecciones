import { Button, Modal, Select, Tag } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Subject } from '../../../interfaces/subject';
import { useEffect, useContext, useState } from 'react';
import { MainContext } from '../../../context/mainContext';
import { MainContextValues } from '../../../interfaces/contextInterfaces';

const EditProyeccionesSubjectModal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  subject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void

}> = ({ open, setOpen, subject, setSelectedSubject }) => {


  const { pnfList, handleSubjectChange, subjects, subjectList } = useContext(MainContext) as MainContextValues
  const [pnfs, setPnfs] = useState<Array<{ value: string, label: string }> | null>(null)
  const [pnfValue, setPnfValue] = useState<string | null>(null)
  const [_subjects, _setSubjects] = useState<Array<{ value: string, label: string }> | null>(null)
  const [subjectValue, setSubjectValue] = useState<string | null>(null)

  useEffect(() => {
    if (subject === null) {
      setOpen(false);
    }
    setPnfValue(subject?.pnf || null)
    setSubjectValue(subject?.subject || null)
  }, [subject, setOpen]);

  useEffect(() => {
    if (!pnfList) return;
    setPnfs(pnfList.map((pnf) => {
      return {
        value: pnf.id,
        label: pnf.name
      }
    }))

    if(!subjectList) return
    _setSubjects(subjectList.map((subject) => {
      return {
        value: subject.id,
        label: subject.name
      }
    }))

  }, [pnfList, setPnfs, subjectList, _setSubjects]);


  const handleOk = () => {
    console.log(subject)
  };

  const handleCancel = () => {
    setSelectedSubject(null);
    setOpen(false);
  };

  const handlePnfChange = (value: string) => {
    setPnfValue(value)
  }
  const _handleSubjectChange = (value: string) => {
    setSubjectValue(value)
  }

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
        <div className='change-proyecciones-subject-modal-container'>
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

        </div>
      </Modal>
    </>
  );
};

export default EditProyeccionesSubjectModal;