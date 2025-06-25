import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../components/layout/MainLaout";
import NotFound from "../components/notFound/NotFoundPage";
import ElementNotFound from "../components/notFound/ElementNotFoud";
import ProyeccionesContainer from "../components/proyecciones/ProyeccionesContainer";
import Login from "../components/login/login";
import ProyeccionesSubjects from "../components/proyeccionesSubjects/proyeccionesSubjects";
import AboutView from "../components/info/AboutView";
import EditTrayectos from "../components/editTrayectos/EditTrayectos";
import RegisterTeacher from "../components/teachers/registerTeacher/RegisterTeacher";
import EditTeachers from "../components/teachers/editTeachers/EditTeachers";
import Profiles from "../components/teachers/profiles/Profiles";
import EditSubjects from "../components/pensum/editSubjects";
import EditPensum from "../components/pensum/editPensum/editPensum";
import EditPNF from "../components/editTrayectos/editPNF/EditPNF";
import Config from "../components/config/config";
import ProtectedRoute from "../components/login/protectedRute";
import EditContracts from "../components/editContracts/EditContracts";
import CreateUserPanel from "../components/createUser/createUserPanel";
import CreateProyectionPanel from "../components/createProyectionPanel/createProyectionPanel";
import AdminPanel from "../components/adminPanel/adminPanel";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <h1>404 no encontrado</h1>,
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        {" "}
        <MainLayout />{" "}
      </ProtectedRoute>
    ),
    children: [
      {
        path: "proyecciones",
        element: <ProyeccionesContainer />,
      },
      {
        path: "active",
        element: <Config />,
      },
      {
        path: "proyecciones/subjects",
        element: <ProyeccionesSubjects />,
      },
      {
        path: "proyecciones/create",
        element: <CreateProyectionPanel />,
      },
      {
        path: "/app/registerTeacher",
        element: <RegisterTeacher />,
      },
      {
        path: "/app/editTeacher",
        element: <EditTeachers />,
      },
      {
        path: "/app/teacherProfiles",
        element: <Profiles />,
      },
      {
        path: "/app/editSubject",
        element: <EditSubjects />,
      },
      {
        path: "/app/pensum/edit",
        element: <EditPensum />,
      },
      {
        path: "/app/editTrayectos",
        element: <EditTrayectos />,
      },
      {
        path: "/app/editPNF",
        element: <EditPNF />,
      },
      {
        path: "/app/contracts",
        element: <EditContracts />,
      },
      {
        path: "/app/admin",
        element: <AdminPanel />,
      },
      {
        path: "/app/singin",
        element: <CreateUserPanel />,
      },
      {
        path: "/app/info",
        element: <AboutView />,
      },
      {
        path: "/app/horarios/create",
        element: <h1>Crear Horario</h1>,
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

export default router;

