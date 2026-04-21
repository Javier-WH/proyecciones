# Fetch - Llamadas a la API

Este módulo contiene todas las funciones de llamada a la API desde el frontend.

---

## 📋 Descripción General

El módulo `src/fetch/` contiene funciones TypeScript para comunicarse con el backend. Cada archivo corresponde a un endpoint o grupo de endpoints relacionados.

**Patrón:**
- Funciones asíncronas que retornan datos del backend
- Manejo de errores con try-catch
- URLs configuradas para desarrollo y producción
- Tipado TypeScript para respuestas

---

## 📁 Estructura

```
src/fetch/
├── schedule/              # Endpoints de horarios
│   ├── scheduleFetch.ts
│   ├── scheduleConfigFetch.ts
│   ├── teacherRestrictions.ts
│   └── classroomOverrideFetch.ts
├── contracts.ts
├── deletePNF.ts
├── deletePensum.ts
├── deleteProfile.ts
├── deleteProyection.ts
├── deleteSubjectInPerfil.ts
├── deleteTrayecto.ts
├── deleteUser.ts
├── fetchPhoto.ts
├── getConfig.ts
├── getInscriptionData.ts
├── getMaya.ts
├── getPensum.ts
├── getPnf.ts
├── getProfile.ts
├── getProfileNames.ts
├── getProyections.ts
├── getSimpleData.ts
├── getSubjects.ts
├── getTeachers.ts
├── getTrayectos.ts
├── getTurnos.ts
├── getUser.ts
├── getUsers.ts
├── login.ts
├── postPNF.ts
├── postPensum.ts
├── postProyection.ts
├── postSubjectToPerfil.ts
├── postSubjects.ts
├── postTeacher.ts
├── postTrayecto.ts
├── postUser.ts
├── putTrayecto.ts
├── putUser.ts
├── report.ts
├── setActiveProyection.ts
└── setProfile.ts
```

---

## 🎨 Patrones de Código

### Patrón Básico

```typescript
export default async function functionName(params: Type) {
  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify(params)

  const url = import.meta.env.MODE === 'development' 
    ? "http://localhost:3000/endpoint" 
    : "/endpoint"

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,
  })

  const data = await response.json()
  return data
}
```

### GET Request

```typescript
export default async function getData() {
  const url = import.meta.env.MODE === 'development' 
    ? "http://localhost:3000/data" 
    : "/data"

  const response = await fetch(url)
  const data = await response.json()
  return data
}
```

---

## 🔧 Funciones Principales

### Autenticación

**login.ts**
```typescript
export default async function login({ email, password }: LoginParams) {
  // POST /login
  // Retorna: { user: {...} }
}
```

### Profesores

**getTeachers.ts**
```typescript
export default async function getTeachers() {
  // GET /teachers
  // Retorna: Teacher[]
}
```

**postTeacher.ts**
```typescript
export default async function postTeacher(teacherData: TeacherData) {
  // POST /teacher
  // Retorna: resultado de creación
}
```

### Proyecciones

**getProyections.ts**
```typescript
export default async function getProyections() {
  // GET /proyecciones
  // Retorna: Proyection[]
}
```

**postProyection.ts**
```typescript
export default async function postProyection({ year, name }) {
  // POST /proyeccion
  // Retorna: resultado de creación
}
```

### Horarios

**schedule/scheduleFetch.ts**
```typescript
export async function getSchedule(params) {
  // GET /schedule
  // Retorna: horario
}

export async function insertOrUpdateSchedule(scheduleData) {
  // POST /schedule
  // Retorna: resultado de guardado
}
```

### Reportes

**report.ts**
```typescript
export async function generateExcelReport(reportData) {
  // POST /excelreport
  // Retorna: archivo Excel
}
```

---

## 🔗 Referencias

- **[docs/BackendAPI.md](./BackendAPI.md)** - Documentación de endpoints
- **[docs/Context.md](./Context.md)** - Gestión de estado global

---

*Última actualización: 21 de abril de 2026*
