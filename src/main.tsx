import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider} from "react-router-dom";
import router from './routes/brouser.tsx';
import { MainContextProvider } from './context/mainContext.tsx';
import "./root.css"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MainContextProvider>
      <RouterProvider router={router} />
    </MainContextProvider> 
  </React.StrictMode>,
)
