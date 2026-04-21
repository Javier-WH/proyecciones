# Context - Gestión de Estado Global

Este módulo documenta el contexto global de React que gestiona el estado compartido de la aplicación.

---

## 📋 Descripción General

El `MainContext` proporciona estado global y funciones compartidas entre componentes. Usa React Context API con hooks personalizados para gestión de estado, sesiones de usuario, y comunicación en tiempo real con Socket.IO.

---

## 🎯 Estado Principal

### Datos de Usuario
```typescript
- userData: UserDataInterface | null - Datos del usuario logueado
- userPNF: string | null - PNF asignado al usuario
- userPerfil: string[] | null - Perfil de materias del usuario
- isAuthenticated: boolean - Estado de autenticación
```

### Datos Académicos
```typescript
- teachers: Teacher[] | null - Lista de profesores
- selectedTeacher: Teacher | null - Profesor seleccionado
- selectedTeacerId: string | null - ID del profesor seleccionado
- selectedQuarter: "q1" | "q2" | "q3" - Trimestre seleccionado
- subjects: Subject[] - Materias de la proyección
- selectedSubject: Subject | null - Materia seleccionada
- pnfList: PNF[] | null - Lista de PNFs
- trayectosList: Trayecto[] - Lista de trayectos
- turnosList: Turno[] - Lista de turnos
```

### Proyección
```typescript
- proyectionName: string | null - Nombre de la proyección activa
- proyectionId: string | null - ID de la proyección activa
- lockedSections: Record<string, Event[]> - Secciones bloqueadas por horario
```

### UI
```typescript
- openAddSubjectToTeacherModal: boolean - Modal de asignación de materias
- openChangeSubjectFromTeacherModal: boolean - Modal de cambio de materia
- editSubjectQuarter: Subject | null - Materia en edición
- showDisconnected: boolean - Mostrar mensaje de desconexión
```

### Socket.IO
```typescript
- socket: Socket | null - Conexión Socket.IO
```

---

## 🔧 Funciones Principales

### Gestión de Profesores
```typescript
setSelectedTeacher(teacher: Teacher | null)
setSelectedTeacerId(id: string | null)
getTeachersHoursData(teacherIndex: number)
```

### Gestión de Materias
```typescript
setSubjects(subjects: Subject[])
setSelectedSubject(subject: Subject | null)
setSelectedQuarter(quarter: "q1" | "q2" | "q3")
handleSubjectChange(data: Subject[])
```

### Gestión de Modales
```typescript
setOpenAddSubjectToTeacherModal(open: boolean)
setOpenChangeSubjectFromTeacherModal(open: boolean)
setEditSubjectQuarter(subject: Subject | null)
```

### Gestión de Proyección
```typescript
setProyectionName(name: string | null)
setProyectionId(id: string | null)
```

---

## 💾 Persistencia

### SessionStorage
- `userPNF` - PNF del usuario
- `userSesion` - Perfil del usuario
- `userData` - Datos del usuario

### LocalStorage
- `schedule_lockedSections` - Secciones bloqueadas de horarios

**Sincronización con Backend:**
- Carga locked sections del backend al cambiar de proyección
- Si hay datos locales y backend vacío, sube datos locales
- Si backend tiene datos, usa datos del backend
- Guarda en backend con debounce (500ms)

---

## 🔌 Socket.IO

### Conexión
```typescript
const socket = io(import.meta.env.MODE === 'development' ? 'http://localhost:3000' : '/')
```

### Eventos
- Conexión/desconexión
- Sincronización de datos en tiempo real
- Notificaciones de cambios

---

## 🔗 Referencias

- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API
- **[docs/Proyecciones.md](./Proyecciones.md)** - Gestión de proyecciones
- **[docs/Teachers.md](./Teachers.md)** - Gestión de profesores

---

*Última actualización: 21 de abril de 2026*
