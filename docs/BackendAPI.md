# Backend API - Endpoints y Rutas

Este módulo documenta todos los endpoints de la API del backend, incluyendo autenticación, middleware, y rutas organizadas por funcionalidad.

---

## 📋 Descripción General

El backend usa **Express.js** con ES Modules. La API está organizada en módulos de rutas separados por funcionalidad. Usa import maps para rutas limpias (`#models/*`, `#utils/*`, `#querys/*`).

**Stack:**
- Express.js como framework web
- Sequelize como ORM
- Express Session para gestión de sesiones
- Socket.IO para comunicación en tiempo real

---

## 🚀 Configuración del Servidor

### Punto de Entrada (index.js)

**Inicialización:**
```javascript
import express from 'express'
import session from 'express-session'
import connectSessionSequelize from 'connect-session-sequelize'
import sequelize from '#dataBaseConnection'

// Creación de tablas
await createTables()
setTableRelations()
await syncSagaTables()
await syncSchedule()
await sessionStore.sync()

// Migración automática de restricciones globales
await checkAndApplyGlobalRestrictions()

// Carga de proyección
await loadProyection()
```

**Configuración de Sesión:**
```javascript
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'UPTLL_Juana_Ramirez',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
})
```

**Middleware de CORS:**
- Configurado en `config/cors/corsConfig.js`
- Permite requests desde el frontend

**Archivos Estáticos:**
- Configurado en `config/static/configureStatic.js`
- Sirve el build del frontend desde `backend/src/frontEnd`

---

## 🔒 Middleware de Autenticación

### validateLogedUser
Verifica si el usuario ha iniciado sesión.

```javascript
export function validateLogedUser (req, res, next) {
  if (process.env.NODE_ENV === 'dev') return next()

  if (req.path === '/') {
    next()
  } else if (req?.session?.user) {
    next()
  } else {
    return res.redirect('/')
  }
}
```

**Uso:** Aplicado a todas las rutas excepto `/login` y rutas públicas.

### validateAdminUser
Verifica si el usuario es administrador (SU).

```javascript
export function validateAdminUser (req, res, next) {
  if (process.env.NODE_ENV === 'dev') return next()
  if (!req?.session?.user) {
    return res.status(401).json({ error: 'Necesitas iniciar sesión para acceder a este recurso' })
  } else if (req?.session?.user?.su) {
    next()
  } else {
    return res.status(401).json({ error: 'Acceso denegado, solo administradores tienen acceso' })
  }
}
```

**Uso:** Aplicado a endpoints que requieren privilegios de administrador.

---

## 🛣️ Estructura de Rutas

### Archivo Principal (routes.js)

```javascript
Router.use(userRoutes)                    // Sin autenticación
Router.all('*', validateLogedUser)         // Middleware de autenticación
Router.use(teacherRoutes)                  // Requiere autenticación
Router.use(pnfRoutes)
Router.use(subjectsRoutes)
Router.use(trayectosRoutes)
Router.use(turnosRoutes)
Router.use(proyectionRoutes)
Router.use(profileRoutes)
Router.use(contractRoutes)
Router.use(simpleDataRoutes)
Router.use(ScheduleRoutes)

Router.post('/excelreport', express.json(), generateExcelReport)

Router.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontEnd', 'index.html'))
})
```

**Importante:** Las rutas de usuario (`userRoutes`) están ANTES del middleware de autenticación para permitir login.

---

## 👤 Rutas de Usuarios (userRoutes)

### Estructura
```
userRoutes/
├── userRoutes.js
├── user.get.js
├── user.post.js
├── user.delete.js
└── user.put.js
```

### Endpoints

#### GET /login
Inicia sesión de usuario.

**Request:**
```json
{
  "email": "usuario@uptll.edu",
  "password": "contraseña"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Nombre",
    "email": "correo",
    "su": true/false,
    "perfil": [...],
    "userPerfil": [...]
  }
}
```

#### POST /user
Crea un nuevo usuario (requiere admin).

#### PUT /user
Actualiza un usuario existente.

#### DELETE /user
Elimina un usuario (requiere admin).

---

## 👨‍🏫 Rutas de Profesores (teacherRoutes)

### Estructura
```
teacherRoutes/
└── teacherRoutes.js
```

### Endpoints

#### GET /teachers
Obtiene lista de todos los profesores.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Nombre",
    "lastName": "Apellido",
    "ci": "cédula",
    "email": "correo",
    "active": true,
    "is_placeholder": false,
    "perfilName": "Materia1, Materia2"
  }
]
```

#### POST /teacher
Crea un nuevo profesor.

**Request:**
```json
{
  "id": "uuid",
  "name": "Nombre",
  "last_name": "Apellido",
  "ci": "cédula",
  "gender_id": "uuid",
  "contractTypes_id": "uuid",
  "title": "Título",
  "perfil_name_id": "uuid",
  "PNF": "uuid",
  "active": "true",
  "is_placeholder": false,
  "email": "correo"
}
```

#### GET /photo/:nombre
Obtiene la foto de un profesor.

#### POST /photo
Sube la foto de un profesor.

---

## 📚 Rutas de PNF (pnfRoutes)

### Endpoints

#### GET /pnf
Obtiene lista de PNFs.

#### POST /pnf
Crea un nuevo PNF (requiere admin).

#### DELETE /pnf/:id
Elimina un PNF (requiere admin).

---

## 📖 Rutas de Materias (subjectsRoutes)

### Endpoints

#### GET /subjects
Obtiene lista de materias.

#### POST /subjects
Crea una nueva materia.

#### DELETE /subjects/:id
Elimina una materia.

---

## 📊 Rutas de Trayectos (trayectosRoutes)

### Endpoints

#### GET /trayectos
Obtiene lista de trayectos.

#### POST /trayecto
Crea un nuevo trayecto.

#### PUT /trayecto
Actualiza un trayecto.

#### DELETE /trayecto/:id
Elimina un trayecto.

---

## 🕐 Rutas de Turnos (turnosRoutes)

### Endpoints

#### GET /turnos
Obtiene configuración de turnos.

---

## 🎯 Rutas de Proyecciones (proyectionRoutes)

### Endpoints

#### GET /proyecciones
Obtiene lista de proyecciones.

#### POST /proyeccion
Crea una nueva proyección.

**Request:**
```json
{
  "year": "2026",
  "name": "Proyección 2026-I"
}
```

#### DELETE /proyeccion/:id
Elimina una proyección.

#### POST /setActiveProyection
Establece la proyección activa.

---

## 👤 Rutas de Perfiles (profileRoutes)

### Endpoints

#### GET /profiles
Obtiene lista de perfiles docentes.

#### GET /profile/:id
Obtiene detalle de un perfil específico.

**Response:**
```json
{
  "id": "uuid",
  "name": "Nombre del perfil",
  "subjects": [
    {
      "subject_id": "redesavanzadas",
      "subject_name": "REDES AVANZADAS",
      "legacy_subject_id": "uuid-opcional"
    }
  ]
}
```

#### POST /profile
Crea un nuevo perfil.

#### POST /subjectToProfile
Agrega una materia a un perfil.

**Request:**
```json
{
  "profile_id": "uuid",
  "subject_id": "redesavanzadas",
  "subject_name": "REDES AVANZADAS"
}
```

#### DELETE /subjectInProfile
Elimina una materia de un perfil.

#### DELETE /profile/:id
Elimina un perfil.

**IMPORTANTE:** Ver `backend/README.md` para detalles sobre el sistema de perfiles y generación de IDs.

---

## 📋 Rutas de Contratos (contractRoutes)

### Endpoints

#### GET /contracts
Obtiene lista de tipos de contrato.

---

## 🗂️ Rutas de Datos Simples (simpleDataRoutes)

### Endpoints

#### GET /genders
Obtiene lista de géneros.

---

## 📅 Rutas de Horarios (ScheduleRoutes)

### Estructura
```
scheduleRoutes/
├── scheduleRoutes.js
├── schedule.js
├── restrictionRoutes.js
├── lockedSectionsRoutes.js
├── scheduleConfigRoutes.js
├── classroomOverrideRoutes.js
├── classroomsRoutes/
├── daysRoutes/
└── hoursRoutes.js
```

### Endpoints Principales

#### GET /schedule
Obtiene horario de una proyección.

**Query Params:**
- `proyectionId`: ID de la proyección
- `pnfId`: ID del PNF
- `trayectoId`: ID del trayecto
- `seccion`: Sección
- `trim`: Trimestre (q1, q2, q3)

#### POST /schedule
Guarda un horario.

**Request:**
```json
{
  "proyectionId": "uuid",
  "schedule": "...",
  "name": "Nombre del horario"
}
```

---

### Restricciones de Materias (restrictionRoutes.js)

#### GET /subject-restrictions/:proyectionId
Obtiene restricciones de aulas por materia para una proyección.

**Response:**
```json
{
  "restrictions": [
    {
      "subject_key": "redesavanzadas",
      "subject_name": "Redes Avanzadas",
      "classroom_ids": ["lab-1", "lab-2"],
      "pnf_id": "uuid",
      "is_exclusive": true,
      "split_hours": false
    }
  ]
}
```

#### POST /subject-restrictions
Guarda restricciones de aulas por materia (requiere admin).

**Request:**
```json
{
  "proyection_id": "uuid",
  "restrictions": [
    {
      "subject_key": "redesavanzadas",
      "subject_name": "Redes Avanzadas",
      "classroom_ids": ["lab-1", "lab-2"],
      "pnf_id": "uuid",
      "is_exclusive": true,
      "split_hours": false
    }
  ]
}
```

**Validaciones:**
- Normaliza `subject_key` (minúsculas, sin tildes, sin espacios)
- Valida que `classroom_ids` tenga al menos un elemento
- Reemplaza completamente las restricciones previas de esa proyección

#### GET /subjectRestriction (Legacy)
Endpoint legacy para restricciones de materias.

---

### Restricciones de Profesores

#### GET /teacher-restrictions/:teacherId
Obtiene restricciones de disponibilidad de un profesor.

**Response:**
```json
{
  "teacher_id": "uuid",
  "restricted_days": [1, 3, 5],
  "restricted_hours": [
    { "day": 2, "start": "08:00", "end": "10:00" },
    { "day": 4, "start": "14:00", "end": "16:00" }
  ]
}
```

#### POST /teacher-restrictions
Guarda restricciones de disponibilidad de un profesor (requiere admin).

**Request:**
```json
{
  "teacher_id": "uuid",
  "restricted_days": [1, 3, 5],
  "restricted_hours": [
    { "day": 2, "start": "08:00", "end": "10:00" },
    { "day": 4, "start": "14:00", "end": "16:00" }
  ]
}
```

**Validaciones:**
- Normaliza días (1-5, lunes a viernes)
- Normaliza horas (formato HH:mm)
- Rechaza traslapes en `restricted_hours`

#### GET /teacher-restrictions
Obtiene lista completa de restricciones de profesores (auditoría).

**IMPORTANTE:** Ver `backend/README.md` para detalles sobre restricciones de profesores.

---

### Secciones Bloqueadas (lockedSectionsRoutes.js)

#### GET /locked-sections
Obtiene secciones bloqueadas de una proyección.

#### POST /locked-sections
Guarda secciones bloqueadas.

**Request:**
```json
[
  {
    "key": "clave-única",
    "pnfId": "uuid",
    "trayectoId": "uuid",
    "seccion": "A",
    "trim": "q1",
    "eventData": { ... }
  }
]
```

---

### Configuración de Horarios (scheduleConfigRoutes.js)

#### GET /schedule-config
Obtiene configuración del horario.

**Response:**
```json
{
  "days": [1, 2, 3, 4, 5],
  "turnos": { ... },
  "conserveSlots": 3,
  "minConsecutiveSlots": 2,
  "distributeEquitably": true,
  "preventSingleHourBlocks": true
}
```

#### POST /schedule-config
Guarda configuración del horario (requiere admin).

---

### Overrides de Aulas (classroomOverrideRoutes.js)

#### GET /classroom-overrides/:proyectionId
Obtiene overrides de aulas para una proyección.

#### POST /classroom-overrides
Guarda overrides de aulas.

---

### Aulas (classroomsRoutes)

#### GET /classrooms
Obtiene lista de aulas.

#### POST /classrooms
Crea una nueva aula (requiere admin).

---

### Días y Horas

#### GET /days
Obtiene días configurados.

#### GET /hours
Obtiene horas configuradas.

---

## 📊 Rutas de Reportes

### POST /excelreport
Genera reporte en Excel.

**Request:**
```json
{
  "proyectionId": "uuid",
  "type": "annual" | "quarter",
  "quarter": "q1" | "q2" | "q3"
}
```

**Response:** Archivo Excel descargable.

---

## 🔧 Funciones de Utilidad

### Normalización de Datos

**normalizeSubjectKey(value)**
```javascript
function normalizeSubjectKey(value) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 255);
  return normalized || null;
}
```

**normalizeClassroomIds(input)**
```javascript
function normalizeClassroomIds(input) {
  const normalized = [
    ...new Set(
      input.map((value) => value.toString().trim())
    ),
  ].filter((value) => Boolean(value));
  return normalized.length ? normalized : null;
}
```

**normalizeHour(value)**
```javascript
function normalizeHour(value) {
  const parts = value.trim().split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Error 401 en endpoints
**Causa:** Usuario no autenticado o sesión expirada.

**Solución:** Verificar que el usuario haya iniciado sesión y que la sesión sea válida.

### Problema: Error 403 en endpoints de admin
**Causa:** Usuario no tiene rol SU.

**Solución:** Verificar que `req.session.user.su` sea `true`.

### Problema: Restricciones no se aplican
**Causa**: IDs de materias no normalizados correctamente.

**Solución**: Usar `normalizeSubjectKey()` en frontend y backend para consistencia.

---

## 🔗 Referencias a Otros Documentos

- **[backend/README.md](../backend/README.md)** - Documentación específica de perfiles y restricciones
- **[docs/BackendDatabase.md](./BackendDatabase.md)** - Modelos y consultas a la base de datos
- **[docs/BackendSchedule.md](./BackendSchedule.md)** - Lógica de horarios en el backend
- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API desde el frontend

---

## ⚙️ Configuración

### Variables de Entorno

```env
PORT=3000
SESSION_SECRET=UPTLL_Juana_Ramirez
NODE_ENV=production
```

### Import Maps

```javascript
// .sequelizerc
{
  "imports": {
    "#models/*": "./src/backEnd/dataBase/models/*.js",
    "#querys/*": "./src/backEnd/dataBase/querys/*.js",
    "#utils/*": "./src/backEnd/utils/*.js",
    "#dataBaseConnection": "./src/backEnd/dataBase/connection/connection.js"
  }
}
```

---

## 🧪 Pruebas Recomendadas

### Autenticación
1. Login con credenciales válidas
2. Intentar acceder a endpoint sin autenticación (debe redirigir a login)
3. Verificar sesión persistente
4. Logout y verificar que se invalida la sesión

### Endpoints de Admin
1. Intentar acceder a endpoint de admin sin rol SU (debe dar 403)
2. Acceder con rol SU (debe funcionar)
3. Verificar que cambios requieran autenticación de admin

### Restricciones
1. Crear restricción de materia
2. Verificar que se normalice el subject_key
3. Crear restricción de profesor
4. Verificar que se normalicen días y horas
5. Intentar crear restricción con traslape (debe rechazar)

---

*Última actualización: 21 de abril de 2026*
