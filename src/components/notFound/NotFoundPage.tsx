import React from 'react';
import { Watermark } from 'antd';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

function NotFound(): React.ReactElement {
  const navigate = useNavigate();
  return <>
    <Watermark content={['404', 'Pagina no encontrada']}>
      <div style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        rowGap: "40px",
      }}>
        <div>
          <h1 style={{ fontSize: "100px" }}>404</h1>
          <p>Pagina no encontrada</p>
        </div>

        <Button type="primary" onClick={() => navigate("/")}>
          Regresar
        </Button>
      </div>
      <div style={{ height: "100vh" }} />
    </Watermark>
  </>
}

export default NotFound;