# Estructura de la Aplicación - Proyecciones

## Descripción General
Aplicación web para la gestión de proyecciones académicas y horarios educativos. Desarrollada con React + TypeScript en el frontend y Node.js + Express + Sequelize en el backend.

---

## Arquitectura General

```
proyecciones/
├── frontend/ (src/)
├── backend/
├── database_schema.md
├── package.json
└── README.md
```

---

## Frontend (React + TypeScript)

### Tecnologías Principales
- **React 18** con TypeScript
- **Vite** como bundler
- **React Router DOM** para navegación
- **Ant Design** para componentes UI
- **React Query** para gestión de estado y caché
- **FullCalendar** para gestión de calendarios
- **Socket.IO Client** para comunicación en tiempo real

### Estructura de Directorios

```
src/
├── main.tsx                 # Punto de entrada de la aplicación
├── root.css                 # Estilos globales
├── vite-env.d.ts           # Tipos de Vite
├── assets/                 # Recursos estáticos
├── components/             # Componentes React
├── context/                # Contextos de React
├── fetch/                  # Funciones de API
├── hooks/                  # Hooks personalizados
├── interfaces/             # Definiciones TypeScript
├── routes/                 # Configuración de rutas
└── utils/                  # Utilidades
```

### Componentes Principales

#### Gestión de Proyecciones
- `createProyectionPanel/` - Panel para crear nuevas proyecciones
- `newProyectionPanel/` - Panel de proyecciones nuevas
- `proyecciones/` - Gestión de proyecciones existentes
- `proyeccionesSubjects/` - Gestión de materias por proyección

#### Gestión de Profesores
- `teachers/` - CRUD de profesores
- `addSubjectToTeacherModal/` - Asignar materias a profesores
- `changeSubjectFromTeacherModal/` - Modificar asignaciones

#### Gestión Académica
- `pensum/` - Gestión de pensum académico
- `editTrayectos/` - Edición de trayectos
- `editSibjectQuarter/` - Edición de materias por trimestre
- `SchoolSchedule/` - Gestión de horarios escolares

#### Sistema
- `login/` - Autenticación
- `adminPanel/` - Panel administrativo
- `createUser/` - Creación de usuarios
- `layout/` - Layout principal
- `report/` - Generación de reportes

---

## Backend (Node.js + Express)

### Tecnologías Principales
- **Node.js** con ES Modules
- **Express.js** como framework web
- **Sequelize** como ORM
- **MySQL** como base de datos
- **Socket.IO** para comunicación en tiempo real
- **JWT** y sesiones para autenticación

### Estructura de Directorios

```
backend/src/
├── backEnd/                # Código principal del backend
├── dev/                    # Herramientas de desarrollo
└── frontEnd/               # Build del frontend
```

#### backEnd/
```
backEnd/
├── index.js                # Punto de entrada del servidor
├── config/                 # Configuraciones
├── controllers/            # Controladores de la API
├── dataBase/               # Configuración y modelos de BD
├── fetch/                  # Lógica de consumo de APIs externas
├── middlewares/            # Middlewares de Express
├── proyeccion/             # Lógica de proyecciones
├── report/                 # Generación de reportes
├── routes/                 # Definición de rutas de la API
├── schedule/               # Lógica de horarios
├── scripts/                # Scripts de mantenimiento
├── socket/                 # Configuración de Socket.IO
└── utils/                  # Utilidades del backend
```

#### dataBase/
```
dataBase/
├── connection/             # Conexión a la base de datos
├── models/                 # Modelos Sequelize
├── querys/                 # Consultas a la BD
└── migrations/             # Migraciones de la BD
```

---

## Base de Datos

### Motor
- **MySQL** con Sequelize ORM

### Módulos Principales

#### 1. Gestión de Horarios
- `classrooms` - Aulas disponibles
- `subjects_restrictions` - Restricciones de materias
- `schedule_config` - Configuración del calendario
- `schedules` - Horarios guardados

#### 2. Personal Académico
- `teachers` - Profesores del sistema
- `teachers_restrictions` - Restricciones de disponibilidad

#### 3. Tablas de Soporte
- `subjects` - Catálogo de materias
- `proyections` - Proyecciones académicas
- `users` - Usuarios del sistema
- `pnfs` - Programas Nacionales de Formación
- `contract_types` - Tipos de contrato
- `genders` - Catálogo de géneros
- `trayectos` - Niveles académicos

---

## Scripts Disponibles

### Frontend
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Previsualizar build
npm run lint         # Linting de código
```

### Backend
```bash
npm run start        # Servidor en producción
npm run dev          # Servidor con hot-reload
npm run mock         # Generar datos de prueba
npm run db:drop      # Eliminar tablas
npm run db:create    # Crear tablas
npm run db:sync      # Sincronizar BD
npm run profiles:migrate  # Migrar perfiles
```

---

## Características Principales

### Funcionalidades
- Gestión de proyecciones académicas
- Asignación de horarios y aulas
- Gestión de profesores y sus restricciones
- Administración de usuarios y permisos
- Generación de reportes en PDF/Excel
- Calendario interactivo con FullCalendar
- Comunicación en tiempo real con Socket.IO

### Autenticación y Seguridad
- Sistema de login con roles (SU, Admin, Regular)
- Gestión de sesiones con Express Session
- Tokens de API para acceso externo

### Exportación e Impresión
- Exportación a Excel con xlsx
- Generación de PDF con jsPDF
- Funcionalidad de impresión con print-js y react-to-print

---

## Flujo de Trabajo Típico

1. **Configuración Inicial**: Crear PNFs, trayectos, materias
2. **Gestión de Profesores**: Registrar profesores y sus restricciones
3. **Creación de Proyección**: Definir periodo académico
4. **Asignación de Materias**: Vincular materias a profesores
5. **Generación de Horarios**: Crear horarios automáticos
6. **Reportes**: Exportar información en diversos formatos

---

## Notas Técnicas

- El frontend se construye y se copia al directorio `backend/src/frontEnd`
- El backend sirve tanto la API como los archivos estáticos del frontend
- Se utiliza import maps en el backend para rutas limpias (`#models/*`, `#utils/*`)
- La aplicación soporta configuración múltiple de entornos mediante archivos `.env`
