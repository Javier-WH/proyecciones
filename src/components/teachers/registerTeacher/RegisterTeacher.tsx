import { Input, Button, InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';
import "./registerTeacher.css"
import femalePlaceHolder from "../../../assets/femalePlaceHolder.svg"

const onCIChange: InputNumberProps['onChange'] = (value) => {
  console.log('changed', value);
};

export default function RegisterTeacher() {
  return <div>
    <div className="title-bar-container" style={{ gridArea: "header", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem" }}>
      <h1 >Registro de profesor</h1>
    </div>

    <div className="register-teacher-form-container">
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", columnGap: "1rem" }}>

        <img src={femalePlaceHolder} alt="" style={{ width: '150px' }} />

        <div style={{ display: "flex", flexDirection: "column", rowGap: "1rem", width: "100%" }}>
          <div >
            <label>Nombre</label>
            <Input placeholder="Nombre del profesor" />
          </div>
          <div >
            <label>Apellido</label>
            <Input placeholder="Apellido del profesor" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "1rem" }}>
        <div className='register-teacher-form-input'>
          <label>Cédula</label>
          <InputNumber min={1} defaultValue={3} onChange={onCIChange} style={{width:"100%"}}/>
        </div>
        <div className='register-teacher-form-input'>
          <label>Genero</label>
          <Input placeholder="Genero del profesor" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", columnGap: "1rem" }}>
        <div className='register-teacher-form-input'>
          <label>Tipo de contrato</label>
          <Input placeholder="Tipo de contrato del profesor" />
        </div>
        <div className='register-teacher-form-input'>
          <label>Titulo</label>
          <Input placeholder="Titulo del profesor" />
        </div>
        <div className='register-teacher-form-input'>
          <label>Perfil</label>
          <Input placeholder="Perfil del profesor" />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "end", columnGap: "1rem", marginTop: "3rem" }}>
        <Button type="dashed" danger>Cancelar</Button>
        <Button type="primary">Registrar</Button>
      </div>

    </div>
  </div>
}