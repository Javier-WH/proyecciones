import React from 'react';
import { Watermark } from 'antd';


function ElementNotFound(): React.ReactElement {

  return <>
    <Watermark content={['404', 'Elemento no encontrado']}>
      <div style={{ height: "100vh" }} />
    </Watermark>
  </>
}

export default ElementNotFound;