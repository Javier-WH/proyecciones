# Application Structure - Proyecciones

## General Description
Web application for managing academic projections and educational schedules. Developed with React + TypeScript on the frontend and Node.js + Express + Sequelize on the backend.

---

## General Architecture

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

### Main Technologies
- **React 18** with TypeScript
- **Vite** as bundler
- **React Router DOM** for navigation
- **Ant Design** for UI components
- **React Query** for state management and caching
- **FullCalendar** for calendar management
- **Socket.IO Client** for real-time communication

### Directory Structure

```
src/
├── main.tsx                 # Application entry point
├── root.css                 # Global styles
├── vite-env.d.ts           # Vite types
├── assets/                 # Static resources
├── components/             # React components
├── context/                # React contexts
├── fetch/                  # API functions
├── hooks/                  # Custom hooks
├── interfaces/             # TypeScript definitions
├── routes/                 # Route configuration
└── utils/                  # Utilities
```

### Main Components

#### Projection Management
- `createProyectionPanel/` - Panel for creating new projections
- `newProyectionPanel/` - New projections panel
- `proyecciones/` - Management of existing projections
- `proyeccionesSubjects/` - Subject management per projection

#### Teacher Management
- `teachers/` - Teacher CRUD
- `addSubjectToTeacherModal/` - Assign subjects to teachers
- `changeSubjectFromTeacherModal/` - Modify assignments

#### Academic Management
- `pensum/` - Academic pensum management
- `editTrayectos/` - Trayecto editing
- `editSibjectQuarter/` - Subject editing per trimester
- `SchoolSchedule/` - School schedule management

#### System
- `login/` - Authentication
- `adminPanel/` - Admin panel
- `createUser/` - User creation
- `layout/` - Main layout
- `report/` - Report generation

---

## Backend (Node.js + Express)

### Main Technologies
- **Node.js** with ES Modules
- **Express.js** as web framework
- **Sequelize** as ORM
- **MySQL** as database
- **Socket.IO** for real-time communication
- **JWT** and sessions for authentication

### Directory Structure

```
backend/src/
├── backEnd/                # Main backend code
├── dev/                    # Development tools
└── frontEnd/               # Frontend build
```

#### backEnd/
```
backEnd/
├── index.js                # Server entry point
├── config/                 # Configurations
├── controllers/            # API controllers
├── dataBase/               # Database configuration and models
├── fetch/                  # External API consumption logic
├── middlewares/            # Express middlewares
├── proyeccion/             # Projection logic
├── report/                 # Report generation
├── routes/                 # API route definitions
├── schedule/               # Schedule logic
├── scripts/                # Maintenance scripts
├── socket/                 # Socket.IO configuration
└── utils/                  # Backend utilities
```

#### dataBase/
```
dataBase/
├── connection/             # Database connection
├── models/                 # Sequelize models
├── querys/                 # Database queries
└── migrations/             # Database migrations
```

---

## Database

### Engine
- **MySQL** with Sequelize ORM

### Main Modules

#### 1. Schedule Management
- `classrooms` - Available classrooms
- `subjects_restrictions` - Subject restrictions
- `schedule_config` - Calendar configuration
- `schedules` - Saved schedules

#### 2. Academic Personnel
- `teachers` - System teachers
- `teachers_restrictions` - Availability restrictions

#### 3. Support Tables
- `subjects` - Subject catalog
- `proyections` - Academic projections
- `users` - System users
- `pnfs` - National Training Programs (PNF)
- `contract_types` - Contract types
- `genders` - Gender catalog
- `trayectos` - Academic levels

---

## Available Scripts

### Frontend
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # Code linting
```

### Backend
```bash
npm run start        # Production server
npm run dev          # Hot-reload server
npm run mock         # Generate test data
npm run db:drop      # Drop tables
npm run db:create    # Create tables
npm run db:sync      # Sync database
npm run profiles:migrate  # Migrate profiles
```

---

## Main Features

### Functionalities
- Academic projection management
- Schedule and classroom assignment
- Teacher and restriction management
- User and permission administration
- PDF/Excel report generation
- Interactive calendar with FullCalendar
- Real-time communication with Socket.IO

### Authentication and Security
- Login system with roles (SU, Admin, Regular)
- Session management with Express Session
- API tokens for external access

### Export and Printing
- Excel export with xlsx
- PDF generation with jsPDF
- Printing functionality with print-js and react-to-print

---

## Typical Workflow

1. **Initial Configuration**: Create PNFs, trayectos, subjects
2. **Teacher Management**: Register teachers and their restrictions
3. **Projection Creation**: Define academic period
4. **Subject Assignment**: Link subjects to teachers
5. **Schedule Generation**: Create automatic schedules
6. **Reports**: Export information in various formats

---

## Technical Notes

- The frontend is built and copied to the `backend/src/frontEnd` directory
- The backend serves both the API and the frontend static files
- Import maps are used in the backend for clean routes (`#models/*`, `#utils/*`)
- The application supports multiple environment configuration via `.env` files
