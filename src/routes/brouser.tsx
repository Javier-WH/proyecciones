import {  createBrowserRouter} from "react-router-dom";
import MainLayout from "../components/layout/MainLaout";
import NotFound from "../components/notFound/NotFoundPage";
import ElementNotFound from "../components/notFound/ElementNotFoud";
import ProyeccionesContainer from "../components/proyecciones/ProyeccionesContainer";
import Login from "../components/login/login";
import ProyeccionesSubjects from "../components/proyeccionesSubjects/proyeccionesSubjects";
import NewProyectionPanel from "../components/newProyectionPanel/NewProyectionPanel";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <h1>404 no encontrado</h1>,
  },
  {
    path: "/app",
    element: <MainLayout />,
    children: [
      {
        path: "proyecciones",
        element: <ProyeccionesContainer />,
      },
      {
        path: "config",
        element: <h1>config</h1>,
      },
      {
        path: "proyecciones/subjects",
        element: <ProyeccionesSubjects />,
      },
      {
        path: "proyecciones/create",
        element: <NewProyectionPanel />,
      },
      {
        path: "*",
        element: <ElementNotFound />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
    errorElement: <h1>404 no encontrado</h1>,
  },
]);

export default router