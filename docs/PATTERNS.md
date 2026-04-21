# Patrones de Código, Arquitectura y Diseño

Este documento documenta todos los patrones de código, arquitectura y diseño usados en el proyecto, tanto en frontend como en backend.

---

## 📋 Índice

- [Patrones de Código Frontend](#patrones-de-código-frontend)
- [Patrones de Código Backend](#patrones-de-código-backend)
- [Patrones de Arquitectura](#patrones-de-arquitectura)
- [Patrones de Diseño](#patrones-de-diseño)

---

## 🎨 Patrones de Código Frontend

### Detección de Bloques con Gaps

**Descripción:** Detectar bloques de horas consecutivas considerando gaps pequeños como parte del mismo bloque.

**Umbral:** 30 minutos de gap máximo

**Ubicación:** `src/components/SchoolSchedule/SchoolSchedule.tsx`

```typescript
const GAP_THRESHOLD_MINUTES = 30;

const detectBlock = (events: Event[], day: string) => {
  const sortedEvents = events.sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  
  const blocks: Event[][] = [];
  let currentBlock: Event[] = [sortedEvents[0]];
  
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEnd = timeToMinutes(currentBlock[currentBlock.length - 1].endTime);
    const currStart = timeToMinutes(sortedEvents[i].startTime);
    const gap = currStart - prevEnd;
    
    if (gap <= GAP_THRESHOLD_MINUTES) {
      currentBlock.push(sortedEvents[i]);
    } else {
      blocks.push(currentBlock);
      currentBlock = [sortedEvents[i]];
    }
  }
  
  if (currentBlock.length > 0) blocks.push(currentBlock);
  return blocks;
};
```

---

### Normalización de IDs de Materias

**Descripción:** Normalizar nombres de materias a IDs consistentes para perfiles docentes.

**Ubicación:** `src/utils/subjectProfile.ts`

```typescript
export function generateSubjectProfileId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Ejemplo: "Redes Avanzadas" → "redesavanzadas"
```

**Uso:** Perfiles docentes, restricciones de materias, comparación de IDs.

---

### Validación de Conflictos

**Descripción:** Detectar conflictos de horarios (profesor, aula, sección).

**Ubicación:** `src/components/SchoolSchedule/SchoolSchedule.tsx`

```typescript
interface Conflict {
  type: 'professor' | 'classroom' | 'section';
  message: string;
}

const checkEventConflicts = (
  event: Event, 
  day: string, 
  startTime: string
): Conflict[] => {
  const conflicts: Conflict[] = [];
  
  // Conflicto de profesor
  const professorConflict = events.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.extendedProps?.teacherId === event.extendedProps?.teacherId &&
    e.startTime === startTime
  );
  if (professorConflict) {
    conflicts.push({ type: 'professor', message: 'Profesor ocupado' });
  }
  
  // Conflicto de aula
  const classroomConflict = events.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.extendedProps?.classroomId === event.extendedProps?.classroomId &&
    e.startTime === startTime
  );
  if (classroomConflict) {
    conflicts.push({ type: 'classroom', message: 'Aula ocupada' });
  }
  
  // Conflicto de sección
  const sectionConflict = events.some(e =>
    e.daysOfWeek?.[0] === day &&
    e.extendedProps?.seccion === event.extendedProps?.seccion &&
    e.extendedProps?.subjectId === event.extendedProps?.subjectId &&
    e.startTime === startTime
  );
  if (sectionConflict) {
    conflicts.push({ type: 'section', message: 'Sección ocupada' });
  }
  
  return conflicts;
};
```

---

### Sincronización de Locked Sections

**Descripción:** Sincronizar secciones bloqueadas entre localStorage y backend con debounce.

**Ubicación:** `src/context/mainContext.tsx`

```typescript
const [lockedSections, setLockedSections] = useState<Record<string, Event[]>>(() => {
  try {
    const stored = localStorage.getItem("schedule_lockedSections");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
});

// Load from backend when proyectionId changes
useEffect(() => {
  if (proyectionId) {
    loadLockedSectionsFromApi();
  }
}, [proyectionId]);

// Save to backend with debounce (500ms)
useEffect(() => {
  localStorage.setItem("schedule_lockedSections", JSON.stringify(lockedSections));
  
  if (!lockedSectionsLoadedRef.current || !proyectionId) return;
  
  if (saveLockedTimeoutRef.current !== null) {
    clearTimeout(saveLockedTimeoutRef.current);
  }
  
  saveLockedTimeoutRef.current = window.setTimeout(async () => {
    try {
      await saveLockedSections(proyectionId, lockedSections);
    } catch (error) {
      console.error("Error saving locked sections to backend:", error);
    }
  }, 500);
  
  return () => {
    if (saveLockedTimeoutRef.current !== null) {
      clearTimeout(saveLockedTimeoutRef.current);
    }
  };
}, [lockedSections, proyectionId]);
```

---

### Prevención de Race Conditions en Fetch

**Descripción:** Usar requestId para prevenir race conditions en operaciones asíncronas.

**Ubicación:** `src/components/teachers/profiles/Profiles.tsx`

```typescript
const subjectsRequestId = useRef(0);

const getSubjectList = async () => {
  const requestId = ++subjectsRequestId.current;
  setIsLoadingSubjects(true);
  
  try {
    const pensumData = await getPensum({...});
    
    // Ignorar respuestas obsoletas
    if (requestId !== subjectsRequestId.current) return;
    
    // Procesar datos...
  } finally {
    setIsLoadingSubjects(false);
  }
};
```

---

### Drag & Drop con dnd-kit

**Descripción:** Implementación de drag & drop context-aware usando @dnd-kit.

**Ubicación:** `src/components/SchoolSchedule/`

```typescript
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// Draggable item
function DraggableEvent({ event }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: { 
      type: 'schedule-event',
      event 
    }
  });
  
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {event.title}
    </div>
  );
}

// Droppable area
function DroppableCell({ onDrop }) {
  const { setNodeRef } = useDroppable({
    id: 'cell-id',
    onDrop: (event) => {
      if (event.active.data.current?.type === 'schedule-event') {
        onDrop(event.active.data.current.event);
      }
    }
  });
  
  return <div ref={setNodeRef} />;
}

// Context
<DndContext onDragEnd={handleDragEnd}>
  <DraggableEvent />
  <DroppableCell />
</DndContext>
```

---

### Manejo de Modales con Estado Global

**Descripción:** Controlar estado de modales desde el contexto global.

**Ubicación:** `src/context/mainContext.tsx`

```typescript
const [openAddSubjectToTeacherModal, setOpenAddSubjectToTeacherModal] = useState(false);
const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

// En componente
const { openAddSubjectToTeacherModal, setOpenAddSubjectToTeacherModal, selectedSubject } = useContext(MainContext);

// Abrir modal
setOpenAddSubjectToTeacherModal(true);
setSelectedSubject(subject);

// Cerrar modal
setOpenAddSubjectToTeacherModal(false);
setSelectedSubject(null);
```

---

## 🔧 Patrones de Código Backend

### Normalización de Datos en Endpoints

**Descripción:** Normalizar datos de entrada para consistencia en la base de datos.

**Ubicación:** `backend/src/backEnd/routes/scheduleRoutes/restrictionRoutes.js`

```javascript
function normalizeSubjectKey(value) {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 255);
  return normalized || null;
}

function normalizeClassroomIds(input) {
  if (!Array.isArray(input)) return null;
  const normalized = [
    ...new Set(
      input.map((value) => {
        if (value === null || value === undefined) return "";
        return value.toString().trim();
      }),
    ),
  ].filter((value) => Boolean(value));
  return normalized.length ? normalized : null;
}

function normalizeHour(value) {
  if (typeof value === "number") value = value.toString();
  if (typeof value !== "string") return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  const parts = trimmed.split(":");
  if (parts.length > 2) return null;
  
  const hour = Number(parts[0]);
  const minute = parts[1] !== undefined ? Number(parts[1]) : 0;
  
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
```

---

### Validación de Restricciones

**Descripción:** Validar restricciones de materias y profesores antes de guardar.

**Ubicación:** `backend/src/backEnd/routes/scheduleRoutes/restrictionRoutes.js`

```javascript
// Validación de restricciones de materias
if (!Array.isArray(restrictions)) {
  return res.status(400).json({ error: "Restrictions must be an array" });
}

for (const restriction of restrictions) {
  if (!restriction.subject_key || !restriction.subject_name) {
    return res.status(400).json({ 
      error: "Each restriction must have subject_key and subject_name" 
    });
  }
  
  if (!Array.isArray(restriction.classroom_ids) || restriction.classroom_ids.length === 0) {
    return res.status(400).json({ 
      error: "Each restriction must have at least one classroom_id" 
    });
  }
}

// Validación de restricciones de profesores
const normalizedDays = normalizeRestrictedDays(restricted_days);
if (normalizedDays === null) {
  return res.status(400).json({ error: "Invalid restricted_days format" });
}

// Validación de traslapes en restricted_hours
for (let i = 0; i < restricted_hours.length; i++) {
  for (let j = i + 1; j < restricted_hours.length; j++) {
    if (restricted_hours[i].day === restricted_hours[j].day) {
      if (hoursOverlap(restricted_hours[i], restricted_hours[j])) {
        return res.status(400).json({ 
          error: "Overlapping restricted_hours for the same day" 
        });
      }
    }
  }
}
```

---

### Uso de Import Maps

**Descripción:** Usar import maps para rutas limpias y mantenibles.

**Ubicación:** `backend/.sequelizerc`

```json
{
  "imports": {
    "#models/*": "./src/backEnd/dataBase/models/*.js",
    "#querys/*": "./src/backEnd/dataBase/querys/*.js",
    "#utils/*": "./src/backEnd/utils/*.js",
    "#dataBaseConnection": "./src/backEnd/dataBase/connection/ORMconnection.js"
  }
}
```

**Uso:**
```javascript
import sequelize from '#dataBaseConnection'
import Teacher from '#models/teachers.js'
import getTeacherList from '#querys/teachers/getTeacherList.js'
```

---

### Migraciones Automáticas con Verificación

**Descripción:** Ejecutar migraciones automáticamente al iniciar el servidor con verificación.

**Ubicación:** `backend/src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js`

```javascript
export async function checkAndApplyGlobalRestrictions() {
  const migrationNeeded = await checkIfMigrationNeeded();
  
  if (migrationNeeded) {
    console.log('Migration needed. Applying...');
    await migrateToGlobalRestrictions();
    console.log('Migration completed successfully.');
  } else {
    console.log('No migration needed.');
  }
}

// En index.js
await checkAndApplyGlobalRestrictions();
```

---

### Transacciones para Operaciones Múltiples

**Descripción:** Usar transacciones de Sequelize para operaciones atómicas.

```javascript
const transaction = await sequelize.transaction();
try {
  await Model1.create(data1, { transaction });
  await Model2.update(data2, { where: {...}, transaction });
  await Model3.destroy({ where: {...}, transaction });
  
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## 🏗️ Patrones de Arquitectura

### Separación Frontend/Backend con API REST

**Descripción:** Frontend y backend separados, comunicación vía API REST.

**Frontend:** React + TypeScript + Vite
**Backend:** Express + Sequelize + MySQL

**Comunicación:**
```typescript
// Frontend
const response = await fetch('/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const result = await response.json();

// Backend
Router.post('/endpoint', express.json(), async (req, res) => {
  const result = await someOperation(req.body);
  res.json(result);
});
```

---

### Context API para Estado Global

**Descripción:** Usar React Context para estado compartido entre componentes.

**Ubicación:** `src/context/mainContext.tsx`

```typescript
export const MainContext = createContext<MainContextValues | null>(null);

export const MainContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  // ... más estado

  return (
    <MainContext.Provider value={{ 
      teachers, setTeachers, 
      subjects, setSubjects 
      // ... más valores
    }}>
      {children}
    </MainContext.Provider>
  );
};

// Uso en componente
const { teachers, setTeachers } = useContext(MainContext) as MainContextValues;
```

---

### Fetch Functions Separadas por Endpoint

**Descripción:** Cada endpoint tiene su propia función fetch en `src/fetch/`.

**Ubicación:** `src/fetch/`

```typescript
// src/fetch/getTeachers.ts
export default async function getTeachers() {
  const url = import.meta.env.MODE === 'development' 
    ? "http://localhost:3000/teachers" 
    : "/teachers";
  
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// src/fetch/postTeacher.ts
export default async function postTeacher(teacherData: TeacherData) {
  const url = import.meta.env.MODE === 'development' 
    ? "http://localhost:3000/teacher" 
    : "/teacher";
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(teacherData)
  });
  
  const data = await response.json();
  return data;
}
```

---

### Modelos Sequelize con Relaciones

**Descripción:** Definir modelos con relaciones usando Sequelize.

**Ubicación:** `backend/src/backEnd/dataBase/models/`

```javascript
// teachers.js
class Teacher extends Model {}
Teacher.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    // ... campos
  },
  { sequelize, modelName: "teachers" }
);

// Relaciones
Teacher.belongsTo(Gender, { foreignKey: 'gender_id' });
Teacher.hasMany(Subject, { foreignKey: 'teacher_id' });
```

---

### Rutas Organizadas por Módulo

**Descripción:** Rutas agrupadas por funcionalidad en directorios separados.

**Ubicación:** `backend/src/backEnd/routes/`

```
routes/
├── userRoutes/
├── teacherRoutes/
├── scheduleRoutes/
│   ├── restrictionRoutes.js
│   ├── lockedSectionsRoutes.js
│   └── ...
├── profileRoutes/
└── ...
```

**Uso:**
```javascript
// routes.js
Router.use(userRoutes)
Router.use(teacherRoutes)
Router.use(ScheduleRoutes)
```

---

### Middleware de Autenticación por Niveles

**Descripción:** Middleware para validar autenticación y roles.

**Ubicación:** `backend/src/backEnd/middlewares/middlewares.js`

```javascript
// Nivel 1: Usuario autenticado
export function validateLogedUser(req, res, next) {
  if (process.env.NODE_ENV === 'dev') return next();
  if (req.path === '/') return next();
  if (req?.session?.user) return next();
  return res.redirect('/');
}

// Nivel 2: Administrador (SU)
export function validateAdminUser(req, res, next) {
  if (process.env.NODE_ENV === 'dev') return next();
  if (!req?.session?.user) {
    return res.status(401).json({ error: 'Necesitas iniciar sesión' });
  }
  if (req?.session?.user?.su) return next();
  return res.status(401).json({ error: 'Solo administradores tienen acceso' });
}

// Uso
Router.all('*', validateLogedUser)
Router.post('/admin-endpoint', validateAdminUser, handler)
```

---

## 🎯 Patrones de Diseño

### Singleton para Conexión de Base de Datos

**Descripción:** Una única instancia de conexión a la base de datos.

**Ubicación:** `backend/src/backEnd/dataBase/connection/ORMconnection.js`

```javascript
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, dialect: 'mysql' }
);

export default sequelize; // Única instancia exportada
```

---

### Observer Pattern con Socket.IO

**Descripción:** Notificar cambios en tiempo real a clientes conectados.

**Ubicación:** `backend/src/backEnd/socket/socket.js`

```javascript
// Server
io.on('connection', (socket) => {
  socket.on('subscribe', (proyectionId) => {
    socket.join(`proyection-${proyectionId}`);
  });
});

// Emitir cambios
io.to(`proyection-${proyectionId}`).emit('schedule-updated', data);

// Client
const socket = io();
socket.emit('subscribe', proyectionId);
socket.on('schedule-updated', (data) => {
  // Manejar actualización
});
```

---

### Strategy Pattern para Generación de Horarios

**Descripción:** Diferentes estrategias de generación según configuración.

**Ubicación:** `src/components/SchoolSchedule/fucntions.tsx`

```typescript
interface GenerationStrategy {
  generate(params: GenerationParams): Event[];
}

class ConservativeStrategy implements GenerationStrategy {
  generate(params: GenerationParams): Event[] {
    // Estrategia conservadora: minimizar cambios
  }
}

class BalancedStrategy implements GenerationStrategy {
  generate(params: GenerationParams): Event[] {
    // Estrategia equilibrada: distribución uniforme
  }
}

class AggressiveStrategy implements GenerationStrategy {
  generate(params: GenerationParams): Event[] {
    // Estrategia agresiva: maximizar eficiencia
  }
}

// Uso
const strategy = config.strategy === 'conservative' 
  ? new ConservativeStrategy()
  : config.strategy === 'aggressive'
    ? new AggressiveStrategy()
    : new BalancedStrategy();

const events = strategy.generate(params);
```

---

### Repository Pattern en Querys

**Descripción:** Abstraer acceso a datos en funciones de query.

**Ubicación:** `backend/src/backEnd/dataBase/querys/`

```javascript
// teachers/getTeacherList.js
import Teachers from '#models/teachers.js';

export default async function getTeacherList() {
  const teachers = await Teachers.findAll({
    attributes: ['id', 'name', 'last_name', 'ci'],
    order: [['last_name', 'ASC']]
  });
  return teachers;
}

// Uso en rutas
import getTeacherList from '#querys/teachers/getTeacherList.js';
const teachers = await getTeacherList();
```

---

## 🔗 Referencias

- **[agents.md](../agents.md)** - Índice de documentación
- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios
- **[docs/BackendAPI.md](./BackendAPI.md)** - Endpoints de API
- **[docs/BackendDatabase.md](./BackendDatabase.md)** - Modelos de base de datos

---

*Última actualización: 21 de abril de 2026*
